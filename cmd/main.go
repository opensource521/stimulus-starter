package main

import (
	"github.com/cerveco/stimulus-starter/cmd/server"
)

func main() {
	s := server.NewServer("localhost", "8080")
	s.Start()
}
