
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
  http.HandleFunc("/viz", indexHandler)
  http.HandleFunc("/viz/viz.js", vizScriptHandler)
  http.HandleFunc("/data/", dataHandlerGen())

  fmt.Println("Starting http server...")
  err := http.ListenAndServe("0.0.0.0:8888", nil)
  if err != nil {
    fmt.Println(err)
  }
}

func indexHandler(w http.ResponseWriter, req *http.Request) {
    file_name := "index.html"
    file_data, _ := ioutil.ReadFile(file_name)
    _, _ = w.Write(file_data)
}

func vizScriptHandler(w http.ResponseWriter, req *http.Request) {
    file_name := "viz.js"
    file_data, _ := ioutil.ReadFile(file_name)
    w.Header().Set("Content-Type", "text/javascript")
    _, _ = w.Write(file_data)
}

func dataHandlerGen() func(http.ResponseWriter, *http.Request) {
  words := UnmarshalJsonList("/home/robert/ngrams/word-list.json")
  return func(w http.ResponseWriter, req *http.Request) {
    path := req.URL.Path

    rangeText := strings.Split(path, "/")
    lower, err := strconv.Atoi(rangeText[2])
    numWanted, err2 := strconv.Atoi(rangeText[3])

    if err != nil {
      fmt.Println("Error: ", err)
      return
    } else if err2 != nil {
      fmt.Println("Error: ", err2)
      return
    }
    upper := numWanted + lower

    if upper - 1 > len(words) {upper = len(words) - 1}

    fmt.Println("Json Request for words", lower, " through ",  upper)

    data := make([]XYonly, numWanted)

    fmt.Println("there are ", len(words), " words.")
    count := 0
    for i := lower; i < upper; i++ {
      data[count] = words[i].TotPgDenBkCnt()
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

