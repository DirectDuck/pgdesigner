package gendata

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/brianvoe/gofakeit/v7"

	"github.com/vmkteam/pgdesigner/pkg/pgd"
)

// genContext holds shared lookup tables for value generation.
type genContext struct {
	tableName    string               // current table name (lowercase)
	enums        map[string][]string  // enum type → labels
	domains      map[string]string    // domain name → base PG type
	domainRanges map[string]intRange  // domain name → min/max int range from CHECK
	checkIN      map[string][]string  // column name → allowed values from CHECK col IN (...)
	checkRange   map[string]intRange  // column name → int range from CHECK col >= N AND col <= M
	overrides    map[string]ColGen    // column name → user override
	rowVals      map[string]string    // column name → already generated value (for same row, e.g. created_at for updated_at)
	partRange    map[string]timeRange // partition key column → min/max time range (for RANGE partitions)
	partListIN   map[string][]string  // partition key column → allowed values (for LIST partitions)
}

// intRange holds min/max integer bounds.
type intRange struct {
	min, max int
}

// timeRange holds min/max time bounds for partition range constraints.
type timeRange struct {
	min, max time.Time
}

// generateValue produces a SQL literal value for a column.
func generateValue(faker *gofakeit.Faker, c pgd.Column, autoInc int, ctx *genContext) string {
	// identity columns: use autoincrement
	if c.Identity != nil {
		return strconv.Itoa(autoInc)
	}

	// partition range constraint: generate within bounds
	if tr, ok := ctx.partRange[c.Name]; ok {
		d := faker.DateRange(tr.min, tr.max)
		return sqlQuote(d.Format("2006-01-02 15:04:05"))
	}
	// partition list constraint: pick from allowed values
	if vals, ok := ctx.partListIN[c.Name]; ok && len(vals) > 0 {
		return sqlQuote(vals[faker.IntRange(0, len(vals)-1)])
	}

	// nullable columns with default: 20% chance of NULL
	if c.Nullable != "false" && c.Default != "" {
		if faker.IntRange(1, 5) == 1 {
			return "NULL"
		}
	}

	// Tier 0: CHECK IN constraint values
	if vals, ok := ctx.checkIN[c.Name]; ok && len(vals) > 0 {
		return sqlQuote(vals[faker.IntRange(0, len(vals)-1)])
	}
	// Tier 0: CHECK range constraint (col >= N AND col <= M)
	if r, ok := ctx.checkRange[c.Name]; ok {
		return strconv.Itoa(faker.IntRange(r.min, r.max))
	}

	// Tier 1: user override
	if ctx.overrides != nil {
		if cg, ok := ctx.overrides[c.Name]; ok {
			return applyOverride(faker, cg, autoInc)
		}
	}

	// Tier 2: name heuristic (skip for json/jsonb — let type fallback handle)
	baseT := strings.ToLower(c.Type)
	if baseT != "json" && baseT != "jsonb" {
		if v, ok := byName(faker, c, autoInc, ctx); ok {
			return v
		}
	}

	// Tier 3: type fallback
	return byType(faker, c, autoInc, ctx)
}

// applyOverride generates a value from an explicit ColGen override.
func applyOverride(faker *gofakeit.Faker, cg ColGen, autoInc int) string {
	switch strings.ToLower(cg.Generator) {
	case "autoincrement":
		return strconv.Itoa(autoInc)
	case "pick":
		values := parsePickValues(cg.Params)
		if len(values) > 0 {
			return sqlQuote(values[faker.IntRange(0, len(values)-1)])
		}
		return "NULL"
	case "email":
		return sqlQuote(faker.Email())
	case "name":
		return sqlQuote(faker.Name())
	case "firstname":
		return sqlQuote(faker.FirstName())
	case "lastname":
		return sqlQuote(faker.LastName())
	case "phone":
		return sqlQuote(faker.Phone())
	case "url":
		return sqlQuote(faker.URL())
	case "uuid":
		return sqlQuote(faker.UUID())
	case "word":
		return sqlQuote(faker.Word())
	case "sentence":
		return sqlQuote(faker.Sentence(8))
	case "paragraph":
		return sqlQuote(faker.Paragraph(1, 3, 5, " "))
	case "city":
		return sqlQuote(faker.City())
	case "country":
		return sqlQuote(faker.Country())
	case "company":
		return sqlQuote(faker.Company())
	case "price":
		return fmt.Sprintf("%.2f", faker.Price(1, 1000))
	case "number":
		return strconv.Itoa(faker.IntRange(1, 10000))
	case "bool":
		return strconv.FormatBool(faker.Bool())
	default:
		// fallback: treat as literal
		return sqlQuote(faker.Word())
	}
}

func parsePickValues(params string) []string {
	for _, part := range strings.Split(params, ",") {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 && strings.TrimSpace(kv[0]) == "values" {
			return strings.Split(strings.TrimSpace(kv[1]), "|")
		}
	}
	// fallback: treat entire params as pipe-separated values
	if params != "" {
		return strings.Split(params, "|")
	}
	return nil
}

// byName tries to match a column name to a semantic generator. Returns ("", false) if no match.
//
// defaultStatuses defines well-known status values for status lookup tables.
//
//nolint:cyclop
var defaultStatuses = []struct {
	id   int
	name string
}{
	{1, "enabled"},
	{2, "disabled"},
	{3, "deleted"},
}

//nolint:gocyclo,cyclop // large switch by column name pattern
func byName(faker *gofakeit.Faker, c pgd.Column, autoInc int, ctx *genContext) (string, bool) {
	name := strings.ToLower(c.Name)

	// status lookup table heuristic: statuses, status, *_statuses, *_status (as table name)
	if isStatusTable(ctx.tableName) {
		if v, ok := statusTableValue(name, autoInc); ok {
			return v, true
		}
	}

	switch {
	case name == "email" || strings.HasSuffix(name, "_email"):
		return sqlQuote(faker.Email()), true
	case name == "phone" || strings.HasSuffix(name, "_phone"):
		return sqlQuote(faker.Phone()), true
	case name == "first_name" || name == "firstname":
		return sqlQuote(truncate(faker.FirstName(), c.Length)), true
	case name == "last_name" || name == "lastname":
		return sqlQuote(truncate(faker.LastName(), c.Length)), true
	case name == "password" || strings.HasSuffix(name, "_password"):
		return sqlQuote(truncate(faker.Password(true, true, true, false, false, 12), c.Length)), true
	case name == "username" || name == "login":
		return sqlQuote(truncate(faker.Username(), c.Length)), true
	case name == "company" || name == "company_name":
		return sqlQuote(truncate(faker.Company(), c.Length)), true

	case name == "url" || name == "link" || name == "href" || strings.HasSuffix(name, "_url") || strings.HasSuffix(name, "_link"):
		return sqlQuote(truncate(faker.URL(), c.Length)), true

	case name == "city":
		return sqlQuote(truncate(faker.City(), c.Length)), true
	case name == "country":
		return sqlQuote(truncate(faker.Country(), c.Length)), true
	case name == "address" || name == "street":
		return sqlQuote(truncate(faker.Street(), c.Length)), true
	case name == "zip" || name == "zip_code" || name == "postal_code":
		return sqlQuote(faker.Zip()), true
	case name == "latitude" || name == "lat":
		return fmt.Sprintf("%.6f", faker.Latitude()), true
	case name == "longitude" || name == "lng" || name == "lon":
		return fmt.Sprintf("%.6f", faker.Longitude()), true

	case name == "color" || name == "colour":
		return sqlQuote(faker.HexColor()), true
	case name == "currency" || name == "currency_code":
		return sqlQuote(faker.CurrencyShort()), true

	case (strings.Contains(name, "avatar") || strings.Contains(name, "image") || strings.Contains(name, "photo") || strings.Contains(name, "picture")) && isStringColumn(c):
		return sqlQuote(truncate(fmt.Sprintf("https://picsum.photos/200/200?random=%d", autoInc), c.Length)), true
	case name == "ip_address" || name == "ip":
		return sqlQuote(faker.IPv4Address()), true
	case name == "user_agent":
		return sqlQuote(truncate(faker.UserAgent(), c.Length)), true

	// person names
	case name == "display_name" || name == "full_name" || name == "author_name" || name == "user_name":
		return sqlQuote(truncate(faker.Name(), c.Length)), true
	// generic name (category, tag, room, etc.) — short noun phrase
	case name == "name" || strings.HasSuffix(name, "_name"):
		return sqlQuote(truncate(faker.Adjective()+" "+faker.Noun(), c.Length)), true
	case name == "title" || name == "subject":
		return sqlQuote(truncate(faker.Sentence(5), c.Length)), true
	case name == "description" || name == "body" || name == "content" || name == "bio" || name == "text":
		return sqlQuote(truncate(faker.Paragraph(1, 3, 5, " "), c.Length)), true
	case name == "slug" || name == "alias":
		return sqlQuote(truncate(strings.ReplaceAll(strings.ToLower(faker.Word()+"-"+faker.Word()), " ", "-"), c.Length)), true

	// price/amount
	case name == "price" || name == "cost" || name == "amount" || name == "total":
		return fmt.Sprintf("%.2f", faker.Price(1, 1000)), true

	// status
	case name == "status_id":
		return "1", true
	case name == "sort_order" || name == "position":
		return strconv.Itoa(autoInc), true

	// timestamps with coherent ordering
	case name == "created_at" || name == "created_date":
		d := faker.DateRange(
			time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		)
		v := sqlQuote(d.Format("2006-01-02 15:04:05"))
		ctx.rowVals["created_at"] = d.Format(time.RFC3339)
		return v, true
	case name == "updated_at" || name == "updated_date" || name == "modified_at" || name == "modified_date":
		base := resolveBaseTime(ctx, faker)
		d := base.Add(time.Duration(faker.IntRange(1, 720)) * time.Hour)
		return sqlQuote(d.Format("2006-01-02 15:04:05")), true
	case name == "deleted_at" || name == "deleted_date":
		base := resolveBaseTime(ctx, faker)
		d := base.Add(time.Duration(faker.IntRange(720, 8760)) * time.Hour)
		return sqlQuote(d.Format("2006-01-02 15:04:05")), true
	case name == "published_at" || name == "published_date":
		base := resolveBaseTime(ctx, faker)
		d := base.Add(time.Duration(faker.IntRange(1, 168)) * time.Hour)
		return sqlQuote(d.Format("2006-01-02 15:04:05")), true
	case name == "expires_at" || name == "expires_date":
		base := resolveBaseTimeAny(ctx, faker, "granted_at", "created_at")
		d := base.Add(time.Duration(faker.IntRange(720, 8760)) * time.Hour)
		return sqlQuote(d.Format("2006-01-02 15:04:05")), true
	case name == "granted_at":
		d := faker.DateRange(
			time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		)
		v := sqlQuote(d.Format("2006-01-02 15:04:05"))
		ctx.rowVals["granted_at"] = d.Format(time.RFC3339)
		return v, true
	case strings.HasSuffix(name, "_at") || strings.HasSuffix(name, "_date"):
		base := resolveBaseTime(ctx, faker)
		d := base.Add(time.Duration(faker.IntRange(1, 720)) * time.Hour)
		return sqlQuote(d.Format("2006-01-02 15:04:05")), true
	}

	return "", false
}

// resolveBaseTimeAny tries multiple keys in order and returns the first found.
func resolveBaseTimeAny(ctx *genContext, faker *gofakeit.Faker, keys ...string) time.Time {
	for _, key := range keys {
		if v, ok := ctx.rowVals[key]; ok {
			if t, err := time.Parse(time.RFC3339, v); err == nil {
				return t
			}
		}
	}
	return faker.DateRange(
		time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	)
}

// resolveBaseTime looks up a previously generated timestamp from ctx, or generates a random one.
func resolveBaseTime(ctx *genContext, faker *gofakeit.Faker) time.Time {
	if v, ok := ctx.rowVals["created_at"]; ok {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			return t
		}
	}
	return faker.DateRange(
		time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	)
}

// byType generates a value based on the PostgreSQL column type.
//
//nolint:gocyclo,cyclop // large switch by PG type
func byType(faker *gofakeit.Faker, c pgd.Column, autoInc int, ctx *genContext) string {
	baseType := strings.ToLower(c.Type)
	isArray := strings.HasSuffix(baseType, "[]")
	if isArray {
		baseType = baseType[:len(baseType)-2]
	}

	// resolve domain to base type; check domain range constraints
	origType := baseType
	if resolved, ok := ctx.domains[baseType]; ok {
		baseType = strings.ToLower(resolved)
	}
	// domain with integer range CHECK (e.g. year >= 1901 AND year <= 2155)
	if dr, ok := ctx.domainRanges[origType]; ok {
		return strconv.Itoa(faker.IntRange(dr.min, dr.max))
	}

	// check if it's an enum type
	if labels, ok := ctx.enums[baseType]; ok && len(labels) > 0 {
		v := labels[faker.IntRange(0, len(labels)-1)]
		if isArray {
			return fmt.Sprintf("ARRAY[%s]::%s[]", sqlQuote(v), c.Type[:len(c.Type)-2])
		}
		return sqlQuote(v)
	}

	// nullable: 10% chance of NULL
	if c.Nullable != "false" && c.Default == "" {
		if faker.IntRange(1, 10) == 1 {
			return "NULL"
		}
	}

	if isArray {
		return generateArrayValue(faker, baseType)
	}

	switch baseType {
	// integers
	case "integer", "int4", "int":
		return strconv.Itoa(faker.IntRange(1, 10000))
	case "bigint", "int8":
		return strconv.Itoa(faker.IntRange(1, 100000))
	case "smallint", "int2":
		return strconv.Itoa(faker.IntRange(1, 100))

	// floats
	case "real", "float4":
		return fmt.Sprintf("%.2f", faker.Float32Range(1, 10000))
	case "double precision", "float8":
		return fmt.Sprintf("%.4f", faker.Float64Range(1, 10000))
	case "numeric", "decimal":
		maxVal := 10000.0
		scale := 2
		if c.Precision > 0 {
			intDigits := c.Precision - c.Scale
			if intDigits > 0 {
				maxVal = math.Pow(10, float64(intDigits)) - 1
			}
			if c.Scale > 0 {
				scale = c.Scale
			}
		}
		return fmt.Sprintf("%.*f", scale, faker.Float64Range(0, maxVal))

	// boolean
	case "boolean", "bool":
		return strconv.FormatBool(faker.Bool())

	// strings
	case "text":
		return sqlQuote(faker.Sentence(8))
	case "varchar", "character varying":
		ml := c.Length
		if ml <= 0 {
			ml = 100
		}
		if ml <= 5 {
			return sqlQuote(faker.LetterN(uint(ml)))
		}
		return sqlQuote(truncate(faker.Sentence(5), ml))
	case "char", "character", "bpchar":
		maxLen := c.Length
		if maxLen <= 0 {
			maxLen = 10
		}
		return sqlQuote(truncate(faker.LetterN(uint(maxLen)), maxLen))

	// uuid
	case "uuid":
		return sqlQuote(faker.UUID())

	// dates/times
	case "date":
		return sqlQuote(faker.Date().Format("2006-01-02"))
	case "timestamp", "timestamp without time zone":
		return sqlQuote(faker.Date().Format("2006-01-02 15:04:05"))
	case "timestamptz", "timestamp with time zone":
		return sqlQuote(faker.Date().Format("2006-01-02 15:04:05-07"))
	case "time", "time without time zone":
		return sqlQuote(faker.Date().Format("15:04:05"))
	case "timetz", "time with time zone":
		return sqlQuote(faker.Date().Format("15:04:05-07"))
	case "interval":
		hours := faker.IntRange(1, 720)
		return sqlQuote(fmt.Sprintf("%d hours", hours))

	// json
	case "json", "jsonb":
		return sqlQuote(fmt.Sprintf(`{"key_%d": "%s"}`, autoInc, faker.Word()))

	// network
	case "inet", "cidr":
		return sqlQuote(faker.IPv4Address())
	case "macaddr", "macaddr8":
		return sqlQuote(faker.MacAddress())

	// geo
	case "point":
		return fmt.Sprintf("'(%.6f,%.6f)'", faker.Latitude(), faker.Longitude())

	// binary
	case "bytea":
		hex := fmt.Sprintf("%06x", faker.IntRange(0, 0xFFFFFF))
		return fmt.Sprintf("'\\x%s'", hex)

	// ranges
	case "int4range":
		a := faker.IntRange(1, 100)
		return fmt.Sprintf("'[%d,%d)'", a, a+faker.IntRange(1, 50))
	case "int8range":
		a := faker.IntRange(1, 10000)
		return fmt.Sprintf("'[%d,%d)'", a, a+faker.IntRange(1, 5000))
	case "tsrange", "tstzrange":
		d := faker.Date()
		hours := faker.IntRange(1, 48)
		d2 := d.Add(time.Duration(hours) * time.Hour)
		return fmt.Sprintf("'[%s,%s)'", d.Format("2006-01-02 15:04:05"), d2.Format("2006-01-02 15:04:05"))
	case "daterange":
		d := faker.Date()
		return fmt.Sprintf("'[%s,%s)'", d.Format("2006-01-02"), d.AddDate(0, 0, faker.IntRange(1, 30)).Format("2006-01-02"))

	// tsvector — empty vector for NOT NULL, NULL otherwise
	case "tsvector":
		if c.Nullable == "false" {
			return "''::tsvector"
		}
		return "NULL"

	// bit types
	case "bit":
		if c.Length > 0 {
			return sqlQuote(strings.Repeat("1", c.Length))
		}
		return sqlQuote("1")
	case "varbit", "bit varying":
		n := c.Length
		if n <= 0 {
			n = 8
		}
		return sqlQuote(strings.Repeat("10", n/2+1)[:n])

	// domain types (fallback to text)
	default:
		// check if it looks like a domain or custom type
		if c.Nullable != "false" {
			return "NULL"
		}
		// best effort: generate a simple value
		return sqlQuote(faker.Word())
	}
}

func generateArrayValue(faker *gofakeit.Faker, baseType string) string {
	count := faker.IntRange(1, 3)
	vals := make([]string, count)

	for i := range count {
		switch baseType {
		case "integer", "int4", "int", "bigint", "int8", "smallint", "int2":
			vals[i] = strconv.Itoa(faker.IntRange(1, 1000))
		case "text", "varchar", "character varying":
			vals[i] = sqlQuote(faker.Word())
		case "boolean", "bool":
			vals[i] = strconv.FormatBool(faker.Bool())
		case "uuid":
			vals[i] = sqlQuote(faker.UUID())
		default:
			vals[i] = sqlQuote(faker.Word())
		}
	}

	return fmt.Sprintf("ARRAY[%s]", strings.Join(vals, ", "))
}

// parseCheckINValues extracts column→allowed values from CHECK constraints like:
//
//	action IN ('INSERT', 'UPDATE', 'DELETE')
//	col IN ('a', 'b')
//
// Returns a map of column name → list of allowed values.
// checkINRe matches: colname IN ('val1', 'val2') or colname = ANY(ARRAY['val1'::type, 'val2'::type])
var checkINRe = regexp.MustCompile(`'([^']+)'`)
var checkColRe = regexp.MustCompile(`^(?:upper|lower)?\(?(\w[\w.]*?)(?:::[\w]+)?\)?\s+(?:IN\s*\(|=\s*ANY\s*\()`)

func parseCheckINValues(checks []pgd.Check) map[string][]string {
	m := make(map[string][]string)
	for _, ch := range checks {
		expr := strings.TrimSpace(ch.Expression)

		// extract column name
		matches := checkColRe.FindStringSubmatch(expr)
		if len(matches) < 2 {
			continue
		}
		colName := matches[1]

		// extract quoted values
		var vals []string
		for _, v := range checkINRe.FindAllStringSubmatch(expr, -1) {
			if len(v) >= 2 {
				val := v[1]
				// strip ::type casts
				if idx := strings.Index(val, "::"); idx >= 0 {
					val = val[:idx]
				}
				vals = append(vals, val)
			}
		}
		if len(vals) > 0 {
			m[colName] = vals
		}
	}
	return m
}

// checkRangeRe matches: col >= N AND col <= M (two parts)
var checkRangeLoRe = regexp.MustCompile(`(?i)(\w+)\s*>=\s*(\d+)`)
var checkRangeHiRe = regexp.MustCompile(`(?i)(\w+)\s*<=\s*(\d+)`)

// parseCheckRanges extracts integer range constraints from CHECK expressions.
func parseCheckRanges(checks []pgd.Check) map[string]intRange {
	m := make(map[string]intRange)
	for _, ch := range checks {
		loMatch := checkRangeLoRe.FindStringSubmatch(ch.Expression)
		hiMatch := checkRangeHiRe.FindStringSubmatch(ch.Expression)
		if len(loMatch) == 3 && len(hiMatch) == 3 && loMatch[1] == hiMatch[1] {
			var lo, hi int
			if _, err := fmt.Sscan(loMatch[2], &lo); err == nil {
				if _, err := fmt.Sscan(hiMatch[2], &hi); err == nil {
					m[loMatch[1]] = intRange{min: lo, max: hi}
				}
			}
		}
	}
	return m
}

// sqlQuote wraps a string in single quotes, escaping embedded single quotes.
func sqlQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

// isQuotedString returns true if s looks like a SQL string literal ('...').
func isQuotedString(s string) bool {
	return len(s) >= 2 && s[0] == '\'' && s[len(s)-1] == '\''
}

// maxLen returns the column's max length, or 0 if unbounded.
func maxLen(c pgd.Column) int {
	if c.Length > 0 {
		return c.Length
	}
	return 0
}

// isStatusTable returns true if the table name looks like a status lookup table.
func isStatusTable(tableName string) bool {
	t := strings.ToLower(tableName)
	return t == "statuses" || t == "status" ||
		strings.HasSuffix(t, "_statuses") || strings.HasSuffix(t, "_status")
}

// statusTableValue generates a value for a status lookup table column.
// Returns well-known id/name pairs: 1=enabled, 2=disabled, 3=deleted.
func statusTableValue(colName string, autoInc int) (string, bool) {
	if autoInc > len(defaultStatuses) {
		// beyond known statuses — fall through to normal generation
		return "", false
	}
	s := defaultStatuses[autoInc-1]

	switch {
	case colName == "id" || strings.HasSuffix(colName, "_id"):
		return strconv.Itoa(s.id), true
	case colName == "name" || colName == "title" || colName == "label":
		return sqlQuote(s.name), true
	}
	return "", false
}

// isStringColumn returns true if the column type is text-like.
func isStringColumn(c pgd.Column) bool {
	switch strings.ToLower(c.Type) {
	case "text", "varchar", "character varying", "char", "character", "bpchar":
		return true
	}
	return false
}

// truncate shortens s to maxLen characters. If maxLen <= 0, returns s unchanged.
func truncate(s string, ml int) string {
	if ml <= 0 || len(s) <= ml {
		return s
	}
	return s[:ml]
}
