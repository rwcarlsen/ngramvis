
package main

import (
  "sort"
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "net/http"
  "encoding/json"
)

const (
  dbServer = "localhost"
  dbName = "ngrams"
  collecName = "words"
)
const (
  cleanRaw = false
)

func main() {
  if cleanRaw {
    ProcessRaw()
    return
  }

  http.HandleFunc("/viz", indexHandler)
  http.HandleFunc("/viz/viz.js", vizScriptHandler)
  http.HandleFunc("/data/", dataHandlerGen())

  fmt.Println("Starting http server...")
  err := http.ListenAndServe("0.0.0.0:8888", nil)
  if err != nil {
    fmt.Println(err)
    return
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
  words := UnmarshalJsonList(jsonWords)

  return func(w http.ResponseWriter, req *http.Request) {
    defer func() {
      if r := recover(); r != nil {
        fmt.Println("Recovered in 'handler'", r)
      }
    }()

    path := req.URL.Path

    rangeText := strings.Split(path, "/")
    if rangeText[2] == "sort" {
      fmt.Println("beginning sort...")
      if rangeText[3] == "pden" {
        sort.Sort(ByPgDensity{words})
      } else if rangeText[3] == "count" {
        sort.Sort(ByCount{words})
      } else if rangeText[3] == "tree" {
        words = TreeToSlice(SliceToTree(words, func(a, b interface{}) bool {
          return a.(*Word).TotalPageDensity() <= b.(*Word).TotalPageDensity()
        }))
      }
      fmt.Println("sort finished")
      fmt.Println("top 10", words[0:10])
      return
    }


    // reorder list
    lower, err := strconv.Atoi(rangeText[2])
    if err != nil {
      panic(err)
    }
    numWanted, err := strconv.Atoi(rangeText[3])
    if err != nil {
      panic(err)
    }

    // allocate space for retrieved data
    data := words[lower:lower + numWanted]

    marshaled, err := json.Marshal(data)
    if err != nil {
      panic(err)
    }

    _, _ = w.Write(marshaled)
  }
}

