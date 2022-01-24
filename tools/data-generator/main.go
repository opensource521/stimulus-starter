package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/cerveco/stimulus-starter/internal/models"
)

func main() {
	limit := 2000
	minPrice := 1.00
	maxPrice := 12.00
	products := make([]*models.Product, limit)
	repoPath := os.Getenv("STIM_ROOT")
	if repoPath == "" {
		log.Fatalf("make sure to source env variable STIM_ROOT to repository root path")
	}
	imageDir := repoPath + "/public/images/products"
	files, err := ioutil.ReadDir(imageDir)
	if err != nil {
		log.Fatalf("failed to read directory: %s - error: %+v", imageDir, err)
	}
	fileCount := len(files)
	rand.Seed(time.Now().UnixNano())
	for i := 0; i < limit; i++ {
		outOfStock := ((i + 1) % 1000) == 0
		price := minPrice + rand.Float64()*(maxPrice-minPrice)
		price = math.Round(price/0.01) * 0.01
		imageIndex := rand.Intn(fileCount - 1)
		name := files[imageIndex].Name()
		imageURL := fmt.Sprintf("/public/images/products/%s", name)
		products[i] = &models.Product{
			ID:         i + 1,
			Name:       name[:strings.LastIndex(name, ".")],
			Price:      price,
			ImageURL:   imageURL,
			OutOfStock: outOfStock,
		}
	}
	file, err := json.MarshalIndent(products, "", " ")
	if err != nil {
		log.Fatalf("failed to marshal product data to json - error: %+v", err)
	}
	if err := ioutil.WriteFile("product_data.json", file, 0644); err != nil {
		log.Fatalf("failed to write product_data.json file - error: %+v", err)
	}
}
