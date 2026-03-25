// Package pgddemo embeds demo .pgd schemas for the welcome screen.
package pgddemo

import "embed"

//go:embed chinook.pgd northwind.pgd pagila.pgd airlines.pgd adventureworks.pgd
var FS embed.FS
