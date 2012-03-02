
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  gosql "github.com/kuroneko/gosqlite3"
  "net/http"
  "encoding/json"
)

func main() {
  indexHandler := staticFileHandler("index.html")

  http.HandleFunc("/", indexHandler)
  http.HandleFunc("/data/", dataHandlerGen())

  fmt.Println("Starting http server...")
  err := http.ListenAndServe("0.0.0.0:8888", nil)
  if err != nil {
    fmt.Println(err)
  }
}

func staticFileHandler(file_name string) func(http.ResponseWriter,
                                               *http.Request) {
  return func(w http.ResponseWriter, req *http.Request) {
    fmt.Println("New Request")
    file_data, _ := ioutil.ReadFile(file_name)
    _, _ = w.Write(file_data)
  }
}

func dataHandlerGen() func(http.ResponseWriter, *http.Request) {
  words := loadWordData("/home/robert/grams2.csv", 100)
  return func(w http.ResponseWriter, req *http.Request) {
    path := req.URL.Path
    num_words, _ := strconv.Atoi(strings.Split(path, "/data/")[1])
    fmt.Println(path)
    fmt.Println(num_words)

    data := make([]XYonly, 0)

    i := 0
    for _, word := range words {
      if word.Length() == 1 {continue}
      data = append(data, word.TotalPageDensityVsBooks())
      if i == num_words {break}
      i++
    }

    marshalled, err := json.Marshal(data)
    if err != nil {
      fmt.Println("Error: ", err)
      return
    }

    //ioutil.WriteFile("testout.json")

    _, _ = w.Write(marshalled)
  }
}

func loadSqliteData() {
  db, _ := gosql.Open("/home/robert/cycout/cyclus.sqlite")
  fmt.Println(db)
}

