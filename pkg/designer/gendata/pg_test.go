//go:build pgtest
// +build pgtest

package gendata

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/vmkteam/pgdesigner/pkg/pgd"
)

// Run with: go test -tags pgtest -run TestPG ./pkg/designer/gendata/
// Requires: PostgreSQL running on localhost:5432, user with createdb permission

func pgExec(t *testing.T, db, sql string) string {
	t.Helper()
	cmd := exec.Command("psql", db, "-t", "-A", "-c", sql)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Logf("psql error: %s\n%s", err, out)
	}
	return strings.TrimSpace(string(out))
}

func pgExecScript(t *testing.T, db, script string) (string, error) {
	t.Helper()
	cmd := exec.Command("psql", db)
	cmd.Stdin = strings.NewReader(script)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func testSchema(t *testing.T, name string, rows int) {
	t.Helper()
	dbName := "pgd_gendata_test_" + name

	// create DB
	pgExec(t, "postgres", fmt.Sprintf("DROP DATABASE IF EXISTS %s", dbName))
	pgExec(t, "postgres", fmt.Sprintf("CREATE DATABASE %s", dbName))
	defer pgExec(t, "postgres", fmt.Sprintf("DROP DATABASE IF EXISTS %s", dbName))

	// load project
	pgdPath := filepath.Join("..", "..", "format", "sql", "testdata", name+".pgd")
	data, err := os.ReadFile(pgdPath)
	require.NoError(t, err)
	var p pgd.Project
	require.NoError(t, xml.Unmarshal(data, &p))

	// generate and apply DDL
	ddl := pgd.GenerateDDL(&p)
	out, _ := pgExecScript(t, dbName, ddl)
	ddlErrors := strings.Count(out, "ERROR:")
	t.Logf("%s DDL: %d errors", name, ddlErrors)

	// disable problematic triggers if any
	pgExec(t, dbName, "DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT tgname, c.relname FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid WHERE NOT t.tgisinternal LOOP EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', r.relname, r.tgname); END LOOP; END $$;")

	// generate test data
	var buf bytes.Buffer
	genErr := Generate(&buf, &p, Options{Seed: 42, Rows: rows})
	require.NoError(t, genErr)

	// apply test data
	out, err = pgExecScript(t, dbName, buf.String())
	if strings.Contains(out, "COMMIT") {
		t.Logf("%s testdata: COMMIT (%d rows/table)", name, rows)
	} else {
		// find first error
		for _, line := range strings.Split(out, "\n") {
			if strings.Contains(line, "ERROR:") {
				t.Errorf("%s testdata ROLLBACK: %s", name, line)
				break
			}
		}
	}

	// count rows
	rowCount := pgExec(t, dbName, "SELECT sum(n_live_tup) FROM pg_stat_user_tables")
	t.Logf("%s total rows: %s", name, rowCount)

	assert.Contains(t, out, "COMMIT", "transaction should commit")
}

func TestPG_Chinook(t *testing.T)   { testSchema(t, "chinook", 20) }
func TestPG_Northwind(t *testing.T) { testSchema(t, "northwind", 30) }
func TestPG_Pagila(t *testing.T)    { testSchema(t, "pagila", 20) }
func TestPG_Adventureworks(t *testing.T) {
	t.Skip("adventureworks has cross-column CHECK (enddate >= startdate) — not supported")
}
func TestPG_Airlines(t *testing.T) {
	t.Skip("airlines has CHECK (scheduled_arrival > scheduled_departure) — cross-column CHECK not supported")
}
