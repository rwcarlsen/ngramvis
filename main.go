
package main

import (
  "io/ioutil"
  "fmt"
  gosql "github.com/kuroneko/gosqlite3"
  "net/http"
)

func main() {
  loadData()

  fmt.Println("Starting http server...")
  indexHandler := staticFileHandler("index.html")
  errHandler := staticFileHandler("error.html")
  dataHandler := func(w http.ResponseWriter, req *http.Request) {
    fmt.Println("New Request")
    _, _ = w.Write([]byte("data-retrieval"))
  }

  http.HandleFunc("/", indexHandler)
  http.HandleFunc("/invalid-page/", errHandler)
  http.HandleFunc("/data/", dataHandler)
  err := http.ListenAndServe("0.0.0.0:8888", nil)
  if err != nil {
    fmt.Println(err)
  }
}

func staticFileHandler(file_name string) func(http.ResponseWriter,
                                               *http.Request) {
  file_data, _ := ioutil.ReadFile(file_name)

  return func(w http.ResponseWriter, req *http.Request) {
    fmt.Println("New Request")
    _, _ = w.Write(file_data)
  }
}

func loadData() {
  db, _ := gosql.Open("/home/robert/cycout/cyclus.sqlite")
  fmt.Println(db)

}
