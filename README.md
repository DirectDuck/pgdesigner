# PgDesigner

Visual PostgreSQL schema designer. Stores schemas in git-friendly `.pgd` XML format. Target: PostgreSQL 18 full DDL spec.

## Features

- **Visual ERD** — interactive schema diagram with auto-layout (Vue Flow)
- **Table Editor** — columns, constraints, indexes, FK with inline editing
- **DDL Generation** — complete CREATE/ALTER SQL from schema model
- **Reverse Engineering** — import from live PostgreSQL via `pg_catalog`
- **Diff Engine** — semantic ALTER SQL between two schema versions
- **Lint** — 60 validation rules with autofix (naming, types, FK, indexes)
- **Format Import** — MicroOLAP PDD, DbSchema DBS, Toad DM2, plain SQL
- **Merge** — combine two schemas (overlay pattern)
- **No CGO** — pure Go, cross-compiles everywhere

## Quick Start

```bash
# Build
make build

# Open schema in browser
pgdesigner schema.pgd

# Reverse-engineer from PostgreSQL
pgdesigner "postgres://user@localhost:5432/mydb?sslmode=disable"

# Convert formats
pgdesigner convert schema.pdd -o schema.pgd
pgdesigner convert "postgres://..." -o schema.pgd

# Generate DDL
pgdesigner generate schema.pgd > schema.sql

# Lint
pgdesigner lint schema.pgd

# Diff two schemas
pgdesigner diff old.pgd new.pgd

# Merge
pgdesigner merge base.pgd overlay.pgd -o merged.pgd
```

## Architecture

- **Backend:** Go — zenrpc JSON-RPC over HTTP
- **Frontend:** Vue 3.5 + Reka UI + Tailwind CSS + Vue Flow
- **Format:** `.pgd` XML — git-friendly, no binary blobs
- **No CGO** — SQL parsing via WebAssembly (wasilibs/go-pgquery)

## Development

```bash
make dev-backend     # Go server on :9990
make dev-frontend    # Vite on :5173
make test            # all tests
make build-full      # pnpm build + go build
make generate        # zenrpc codegen
make ts-client       # rpcgen → TypeScript client
```

## PGD Format

Git-friendly XML for PostgreSQL schemas. Covers tables, columns, indexes, FK, constraints, views, functions, triggers, sequences, enums, domains, composites, ranges, partitions, policies, roles, grants, comments, and diagram layouts.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pgd version="1" pg-version="18" default-schema="public">
  <schema name="public">
    <table name="users">
      <column name="id" type="bigint" nullable="false">
        <identity generated="always"></identity>
      </column>
      <column name="email" type="varchar" length="255" nullable="false"></column>
      <pk name="pk_users">
        <column name="id"></column>
      </pk>
    </table>
  </schema>
</pgd>
```

Full spec: [docs/pgd-format/spec.md](docs/pgd-format/spec.md)

## PGD Spec Coverage

How well each layer supports the [PGD format spec](docs/pgd-format/spec.md) (22 sections).

| Spec Section | Read | Write | DDL Gen | SQL Parse | RE | UI |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1. Project metadata | + | + | — | + | — | + |
| 2. Database | + | + | — | — | — | — |
| 3. Roles | + | + | + | — | — | — |
| 4. Tablespaces | + | + | + | — | — | — |
| 5. Extensions | + | + | + | + | + | + |
| 6. Types (enum) | + | + | + | + | + | + |
| 6. Types (domain) | + | + | + | + | + | + |
| 6. Types (composite) | + | + | + | + | — | — |
| 6. Types (range) | + | + | + | — | — | — |
| 7. Sequences | + | + | + | + | + | + |
| 8. Schemas | + | + | + | + | + | + |
| 9. Tables | + | + | + | + | + | + |
| 10. Columns | + | + | + | + | + | + |
| 10. Identity | + | + | + | + | + | + |
| 10. Generated (stored) | + | + | + | + | + | + |
| 10. Collation | + | + | + | + | + | — |
| 10. Compression | + | + | + | — | + | — |
| 10. Storage | + | + | + | — | + | — |
| 11. PK | + | + | + | + | + | + |
| 11. FK | + | + | + | + | + | + |
| 11. Unique | + | + | + | + | + | + |
| 11. Check | + | + | + | + | + | + |
| 11. Exclude | + | + | + | + | + | + |
| 12. Storage params (WITH) | + | + | + | — | — | — |
| 13. Partitioning | + | + | + | + | + | + |
| 14. Indexes | + | + | + | + | + | + |
| 14. Expression indexes | + | + | + | + | + | — |
| 14. Partial indexes (WHERE) | + | + | + | + | + | — |
| 14. INCLUDE | + | + | + | + | + | — |
| 15. Views | + | + | + | + | + | + |
| 15. Materialized views | + | + | + | + | + | + |
| 16. Functions | + | + | + | + | + | + |
| 16. Aggregates | + | + | + | + | — | — |
| 17. Triggers | + | + | + | + | + | + |
| 18. Policies (RLS) | + | + | + | — | — | — |
| 19. Comments | + | + | + | + | + | + |
| 20. Grants | + | + | + | — | — | — |
| 21. Rules (deprecated) | + | + | — | — | — | — |
| 22. Layouts | + | + | — | — | — | + |

**Legend:** Read = XML unmarshal, Write = XML marshal, DDL Gen = SQL output, SQL Parse = pg_dump/SQL import, RE = reverse engineering from live PG, UI = visual editor.

## Test Databases

Round-trip tested on 6 databases (SQL → PGD → DDL → PostgreSQL → pg_dump → PGD → diff = zero):

| Database | Tables | FK | Source |
|----------|-------:|---:|--------|
| Chinook | 11 | 11 | [lerocha/chinook-database](https://github.com/lerocha/chinook-database) |
| Northwind | 14 | 13 | [pthom/northwind_psql](https://github.com/pthom/northwind_psql) |
| Pagila | 15 | 18 | [devrimgunduz/pagila](https://github.com/devrimgunduz/pagila) |
| Airlines | 8 | 8 | [Postgres Pro Demo](https://postgrespro.com/community/demodb) |
| AdventureWorks | 68 | 89 | [lorint/AdventureWorks-for-Postgres](https://github.com/lorint/AdventureWorks-for-Postgres) |
| Synthetic | 8 | 9 | Custom (domains, GIN/GiST, triggers, RLS) |

## License

[PolyForm Noncommercial License 1.0.0](LICENSE) — free for non-commercial use. See [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) for commercial licensing.
