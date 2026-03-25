<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: string }>()

const keywords = new Set([
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'UNIQUE', 'PRIMARY', 'KEY',
  'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'DEFAULT', 'CHECK', 'CONSTRAINT',
  'ON', 'DELETE', 'UPDATE', 'CASCADE', 'RESTRICT', 'SET', 'NO', 'ACTION',
  'INSERT', 'INTO', 'VALUES', 'SELECT', 'FROM', 'WHERE', 'AND', 'OR',
  'AS', 'IF', 'EXISTS', 'SCHEMA', 'SEQUENCE', 'VIEW', 'FUNCTION',
  'TRIGGER', 'RETURNS', 'LANGUAGE', 'BEGIN', 'END', 'DECLARE', 'RETURN',
  'USING', 'WITH', 'WITHOUT', 'OIDS', 'ADD', 'COLUMN', 'TYPE',
  'COMMENT', 'IS', 'EXTENSION', 'DOMAIN', 'ENUM', 'INHERITS',
  'PARTITION', 'BY', 'RANGE', 'LIST', 'HASH', 'MATERIALIZED',
  'REPLACE', 'PROCEDURE', 'IMMUTABLE', 'STABLE', 'VOLATILE',
  'SECURITY', 'DEFINER', 'PARALLEL', 'SAFE', 'STRICT',
  'BEFORE', 'AFTER', 'EACH', 'ROW', 'EXECUTE', 'FOR',
  'GRANT', 'REVOKE', 'ALL', 'PRIVILEGES', 'TO', 'IN',
  'GENERATED', 'ALWAYS', 'IDENTITY', 'DEFERRABLE', 'INITIALLY',
  'DEFERRED', 'IMMEDIATE', 'EXCLUDE', 'INCLUDE', 'TABLESPACE',
  'UNLOGGED', 'TEMPORARY', 'TEMP', 'OWNED', 'NONE',
])

const types = new Set([
  'INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
  'BOOLEAN', 'BOOL', 'TEXT', 'VARCHAR', 'CHAR', 'CHARACTER',
  'TIMESTAMP', 'TIMESTAMPTZ', 'DATE', 'TIME', 'TIMETZ', 'INTERVAL',
  'NUMERIC', 'DECIMAL', 'REAL', 'FLOAT', 'DOUBLE', 'PRECISION',
  'JSON', 'JSONB', 'UUID', 'BYTEA', 'OID', 'MONEY',
  'INET', 'CIDR', 'MACADDR', 'BIT', 'VARBIT', 'XML',
  'TSVECTOR', 'TSQUERY', 'POINT', 'LINE', 'LSEG', 'BOX',
  'PATH', 'POLYGON', 'CIRCLE', 'HSTORE', 'LTREE', 'ARRAY',
  'VARYING', 'ZONE',
])

function highlightSQL(sql: string): string {
  return sql.replace(
    /('(?:[^'\\]|\\.)*')|("(?:[^"\\]|\\.)*")|(--[^\n]*)|(\b\w+\b)/g,
    (match, str, ident, comment, word) => {
      if (str) return `<span class="sql-str">${match}</span>`
      if (ident) return `<span class="sql-ident">${match}</span>`
      if (comment) return `<span class="sql-comment">${match}</span>`
      if (word) {
        const upper = word.toUpperCase()
        if (keywords.has(upper)) return `<span class="sql-kw">${match}</span>`
        if (types.has(upper)) return `<span class="sql-type">${match}</span>`
      }
      return match
    },
  )
}

const highlighted = computed(() => highlightSQL(props.value))
</script>

<template>
  <pre class="sql-viewer" v-html="highlighted" />
</template>

<style>
.sql-viewer {
  margin: 0;
  padding: 0.615rem;
  min-height: 100%;
  font-family: monospace;
  font-size: 0.923rem;
  line-height: 1.5;
  white-space: pre;
  color: var(--color-sql-text);
}
.sql-kw { color: var(--color-sql-keyword); }
.sql-type { color: var(--color-sql-type); }
.sql-str { color: var(--color-sql-string); }
.sql-ident { color: var(--color-sql-ident); }
.sql-comment { color: var(--color-sql-comment); }
</style>
