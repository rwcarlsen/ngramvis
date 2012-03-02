
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
  words := UnmarshalJson("word-list.json")
  return func(w http.ResponseWriter, req *http.Request) {
    path := req.URL.Path
    num_words, err := strconv.Atoi(strings.Split(path, "/data/")[1])
    if err != nil {
      fmt.Println("Error: ", err)
      return
    }

    fmt.Println("Json Request for ", num_words, " words. Preping words...")

    data := make([]XYonly, num_words)

    fmt.Println("there are ", len(words), " words.")
    count := 0
    for _, word := range words {
      if word.TotalBooks() < 10000 {continue}
      data[count] = word.TotPgDenBkCnt()
      if count == num_words - 1 {break}
      count++
    }

    fmt.Println("there are ", len(data), " datums ready.")

    fmt.Println("  Words prepared. Marshaling...")
    marshaled, err := json.Marshal(data)
    if err != nil {
      fmt.Println("Error: ", err)
      return
    }
    fmt.Println("  Marshaling complete. Sending json data...")
    _, _ = w.Write(marshaled)
    fmt.Println("  Request fulfilled.")
  }
}

func loadSqliteData() {
  db, _ := gosql.Open("/home/robert/cycout/cyclus.sqlite")
  fmt.Println(db)
}

