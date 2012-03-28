
package main

import (
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
  data := make([]*XYonly, 0)

  var weights, maxes Weights
  maxes.Length = 12 * 1.333333
  maxes.Count = 1e7 * .15256
  maxes.Pages = 1e7 * 2.7316
  maxes.Books = 1e5 * 6.6948
  maxes.PageDen = 17 * 1.05334


  return func(w http.ResponseWriter, req *http.Request) {
    defer func() {
      if r := recover(); r != nil {
        fmt.Println("Recovered in 'handler'", r)
      }
    }()

    path := req.URL.Path

    rangeText := strings.Split(path, "/")
    if rangeText[2] == "reweight" {
      year := rangeText[3]
      length, _ := strconv.ParseFloat(rangeText[4], 32)
      count, _ := strconv.ParseFloat(rangeText[5], 32)
      pages, _ := strconv.ParseFloat(rangeText[6], 32)
      books, _ := strconv.ParseFloat(rangeText[7], 32)
      pageden, _ := strconv.ParseFloat(rangeText[8], 32)

      tot := float32(length + count + pages + books + pageden)

      weights.Length = float32(length) / tot
      weights.Count = float32(count) / tot
      weights.Pages = float32(pages) / tot
      weights.Books = float32(books) / tot
      weights.PageDen = float32(pageden) / tot
      fmt.Println("new weights: ", length, count, pages, books, pageden)

      fmt.Println("scoring, building XYonly, and sorting...")

      // get score calcing function
      scorer := WeightedScoreGenerator(year, weights, maxes)

      // generate scores for words if possible
      scored, scores := GetScores(words, scorer)

      // convert to XYonly structs
      data = BuildXY(scored, scores, BkVpden(year))

      // sort it
      data = TreeToXYonly(XYonlyToTree(data, func(a, b interface{}) bool {
        return a.(*XYonly).S <= b.(*XYonly).S
      }))

      return
    }

    lower, err := strconv.Atoi(rangeText[2])
    if err != nil {
      panic(err)
    }
    numWanted, err := strconv.Atoi(rangeText[3])
    if err != nil {
      panic(err)
    }
    if numWanted > len(data) {
      numWanted = len(data)
    }

    marshaled, err := json.Marshal(data[lower:lower + numWanted])
    if err != nil {
      panic(err)
    }

    _, _ = w.Write(marshaled)
    fmt.Println("request filled.")
  }
}

