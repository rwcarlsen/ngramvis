
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "net/http"
  "encoding/json"
)

func main() {

  indexHandler := staticFileHandler("index.html")

  http.HandleFunc("/viz", indexHandler)
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
  words := UnmarshalJsonList("/home/robert/ngrams/word-list.json")
  return func(w http.ResponseWriter, req *http.Request) {
    path := req.URL.Path
    num_words, err := strconv.Atoi(strings.Split(path, "/data/")[1])
    if err != nil {
      fmt.Println("Error: ", err)
      return
    }

    fmt.Println("Json Request for ", num_words, " words.")

    data := make([]XYonly, num_words)

    fmt.Println("there are ", len(words), " words.")
    count := 0
    for _, word := range words {
      data[count] = word.TotPgDenBkCnt()
      if count == num_words - 1 {break}
      count++
    }

    marshaled, err := json.Marshal(data)
    if err != nil {
      fmt.Println("Error: ", err)
      return
    }
    _, _ = w.Write(marshaled)
  }
}

