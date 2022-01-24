package server

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/unrolled/render"

	"github.com/cerveco/stimulus-starter/internal/models"
)

var (
	templateFuncs = []template.FuncMap{
		{
			"html": func(html string) template.HTML {
				return template.HTML(html)
			},
			"js": func(js string) template.JS {
				return template.JS(js)
			},
		},
	}
)

type Server struct {
	server   *http.Server
	Mux      *chi.Mux
	Render   *render.Render
	rootDir  string
	Products []*models.Product
}

type Response struct {
	Status string `json:"status"`
}

func NewServer(address string, port string) *Server {
	rootDir := os.Getenv("STIM_ROOT")
	s := &Server{
		server: &http.Server{
			Addr: fmt.Sprintf("%s:%s", address, port),
		},
		Mux: chi.NewMux(),
		Render: render.New(render.Options{
			Directory:     filepath.Join(rootDir, "views"),
			Layout:        filepath.Join("layout", "base"),
			IsDevelopment: true,
			Extensions:    []string{".html", ".gohtml", ".tmpl"},
			Funcs:         templateFuncs,
		}),
		rootDir: rootDir,
	}
	s.Mux.Use(middleware.Logger)
	s.Mux.Group(func(r chi.Router) {
		r.Get("/", s.ShowIndex)
		r.Get("/health", s.HealthCheck)
	})
	s.server.Handler = s.Mux
	return s
}

func (s *Server) Start() {
	public := http.Dir(filepath.Join(s.rootDir, "/public/"))
	log.Printf("[INFO]: file server starting views directory: %s", public)
	FileServer(s.Mux, "/public", public)
	log.Printf("[INFO]: http server starting on %s", s.server.Addr)
	log.Printf("[INFO]: reading product_data.json file")
	s.ReadJSONDataFile()
	log.Printf("[INFO]: successfully read product_data.json file")
	s.server.ListenAndServe()
}

func (s *Server) ReadJSONDataFile() {
	jsonFile, err := os.Open(s.rootDir + "/product_data.json")
	if err != nil {
		log.Fatalf("[ERROR]: failed to open product_data.json file - error: %+v", err)
	}
	defer jsonFile.Close()
	fileBytes, err := ioutil.ReadAll(jsonFile)
	if err != nil {
		log.Fatalf("[ERROR]: failed to read product_data.json file - error: %+v", err)
	}
	if err := json.Unmarshal(fileBytes, &s.Products); err != nil {
		log.Fatalf("[ERROR]: failed unmarshal json data into product structure - error: %+v", err)
	}
}

func (s *Server) HTML(w http.ResponseWriter, r *http.Request, view string, data map[string]interface{}) {
	data["company"] = "Cerve"
	data["images"] = "/public/images/products"
	data["icons"] = "/public/images/ui"
	if tmpl := s.Render.TemplateLookup(view); tmpl != nil {
		if err := s.Render.HTML(w, http.StatusOK, view, data); err != nil {
			log.Printf("[ERROR]: failed to render html view - view: %s - data: %+v", view, data)
		}
	} else {
		s.Render.JSON(w, http.StatusNotFound, struct {
			Message string
		}{
			Message: "page not found",
		})
	}
}

func (s *Server) ShowIndex(w http.ResponseWriter, r *http.Request) {
	data := make(map[string]interface{})
	data["products"] = s.Products
	s.HTML(w, r, "index", data)
}

func (s *Server) HealthCheck(w http.ResponseWriter, r *http.Request) {
	s.Render.JSON(w, http.StatusOK, Response{Status: "OK"})
}

func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}
	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"
	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		rctx := chi.RouteContext(r.Context())
		pathPrefix := strings.TrimSuffix(rctx.RoutePattern(), "/*")
		fs := http.StripPrefix(pathPrefix, http.FileServer(root))
		fs.ServeHTTP(w, r)
	})
}
