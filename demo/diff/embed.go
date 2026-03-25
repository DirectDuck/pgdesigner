// Package diffdemo embeds demo diff pairs for the welcome screen.
package diffdemo

import "embed"

//go:embed */*.pgd
var FS embed.FS
