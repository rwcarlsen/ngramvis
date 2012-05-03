
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "net/http"
  "encoding/json"
  "math"
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
  http.HandleFunc("/viz/scattergrams.css", cssFileHandler)
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

func cssFileHandler(w http.ResponseWriter, req *http.Request) {
    file_name := "scattergrams.css"
    file_data, _ := ioutil.ReadFile(file_name)
    w.Header().Set("Content-Type", "text/css")
    _, _ = w.Write(file_data)
}

func dataHandlerGen() func(http.ResponseWriter, *http.Request) {
  words := UnmarshalJsonList(jsonWords)
  data := make([]*XYonly, 0)

  var weights, maxes Weights
  setMaxWeights(&maxes)

  return func(w http.ResponseWriter, req *http.Request) {
    //defer func() {
    //  if r := recover(); r != nil {
    //    fmt.Println(r)
    //    fmt.Println("Recovered in 'handler'", r)
    //  }
    //}()

    path := req.URL.Path

    rangeText := strings.Split(path, "/")
    if rangeText[2] == "reweight" {
      year := rangeText[3]

      updateWeights(rangeText, &weights)

      fmt.Println("scoring, building XYonly, and sorting...")

      // get score calcing function
      scorer := WeightedScoreGenerator(year, weights, maxes)

      // generate scores for words if possible
      scored, scores := GetScores(words, scorer)

      // convert to XYonly structs
      data = BuildXY(scored, scores, Pden(year), Bk(year), Tmp(year))

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
      fmt.Println("rangeText: ", rangeText)
      fmt.Println(err)
      panic(err)
    }

    _, _ = w.Write(marshaled)
    fmt.Println("request filled.")
  }
}

func setMaxWeights(w *Weights) {
  w.Length = 12 * 1.333333
  w.Count = 1e7 * .15256 * 430
  w.Pages = 1e7 * 2.7316
  w.Books = 1e5 * 6.6948 * 0.162
  w.PageDen = 17 * 1.05334 * 1.123
  w.Temp = 1
}

func updateWeights(text []string, w *Weights) {
  length, _  := strconv.ParseFloat(text[4], 32);
  count, _   := strconv.ParseFloat(text[5], 32);
  pages, _   := strconv.ParseFloat(text[6], 32);
  books, _   := strconv.ParseFloat(text[7], 32);
  pageden, _ := strconv.ParseFloat(text[8], 32);
  temp, _ := strconv.ParseFloat(text[9], 32);

  tot := float32(math.Abs(length) + math.Abs(count) + math.Abs(pages) + math.Abs(books) + math.Abs(pageden) + math.Abs(temp))
  if tot == 0 {
    tot = 1
  }

  w.Length = float32(length) / tot
  w.Count = float32(count) / tot
  w.Pages = float32(pages) / tot
  w.Books = float32(books) / tot
  w.PageDen = float32(pageden) / tot
  w.Temp = float32(temp) / tot

  fmt.Println("new weights: ", length, count, pages, books, pageden, temp)
}

