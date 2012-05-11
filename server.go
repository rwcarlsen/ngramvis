
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

type wordState struct {
  words []*Word
  wordMap map[string]*Word
  data []*XYonly
  xName string
  yName string
  otherName string
  year string
  weights Weights
  maxes Weights
  scored []*Word
  scores []float32
}

func NewState(jsonWords string) *wordState {
  words := UnmarshalJsonList(jsonWords)
  wordMap := wordMapFor(words)
  maxes := getMaxWeights()
  st := &wordState{
      words:words,
      wordMap:wordMap,
      maxes:maxes,
      data:make([]*XYonly, 0),
    }
  return st
}

func (st *wordState) Rescore(params []string) {
  st.year = params[0]
  st.updateWeights(params)

  fmt.Println("rescoring words")

  // get score calcing function
  scorer := WeightedScoreGenerator(st.year, st.weights, st.maxes)

  // generate scores for words if possible
  fmt.Println("wordslen=", len(st.words))
  st.scored, st.scores = GetScores(st.words, scorer)
  st.buildAndSort()
}

func (st *wordState) updateWeights(text []string) {
  length, _  := strconv.ParseFloat(text[1], 32);
  count, _   := strconv.ParseFloat(text[2], 32);
  pages, _   := strconv.ParseFloat(text[3], 32);
  books, _   := strconv.ParseFloat(text[4], 32);
  pageden, _ := strconv.ParseFloat(text[5], 32);
  temp, _ := strconv.ParseFloat(text[6], 32);
  bookden, _ := strconv.ParseFloat(text[7],32);

  tot := float32(math.Abs(length) + math.Abs(count) + math.Abs(pages) + math.Abs(books) + math.Abs(pageden) + math.Abs(temp) + math.Abs(bookden))
  if tot == 0 {
    tot = 1
  }

  st.weights.Length = float32(length) / tot
  st.weights.Count = float32(count) / tot
  st.weights.Pages = float32(pages) / tot
  st.weights.Books = float32(books) / tot
  st.weights.PageDen = float32(pageden) / tot
  st.weights.Temp = float32(temp) / tot
  st.weights.BookDen = float32(bookden) / tot

  fmt.Println("updated weights: ", length, count, pages, books, pageden, temp, bookden)
}

func (st *wordState) BestYearForFollowed(names []string) int {
  wordData := []*Word{}

  for _, name := range names {
    wordData = append(wordData, st.wordMap[name])
  }

  var bestScore float32 = 0
  bestYear := 1700
  for y := 1700; y <= 2008; y++ {
    scrFunc := WeightedScoreGenerator(strconv.Itoa(y), st.weights, st.maxes)
    _, followScores := GetScores(wordData, scrFunc)
    tot := sum(followScores)
    if tot > bestScore {
      bestScore = tot
      bestYear = y
    }
  }
  return bestYear
}

func (st *wordState) DataFor(params []string) []*XYonly {
  fmt.Println("1datalen=", len(st.data))
  if st.xName != params[0] || st.yName != params[1] || st.otherName != params[2] {
    fmt.Println("updating axes")
    st.xName = params[0]
    st.yName = params[1]
    st.otherName = params[2]
    st.buildAndSort()
  }
  fmt.Println("2datalen=", len(st.data))
  return st.data
}

func (st *wordState) buildAndSort() {
  fmt.Println("3datalen=", len(st.data))
  fmt.Println("3scoredlen=", len(st.scored))
  xFunc := paramFuncFor(st.xName, st.year)
  yFunc := paramFuncFor(st.yName, st.year)
  otherFunc := paramFuncFor(st.otherName, st.year)

  fmt.Println("building and sorting xy structs")
  // convert to XYonly structs
  st.data = BuildXY(st.scored, st.scores, xFunc, yFunc, otherFunc)

  fmt.Println("4datalen=", len(st.data))
  // sort it
  st.data = TreeToXYonly(XYonlyToTree(st.data, func(a, b interface{}) bool {
    return a.(*XYonly).S <= b.(*XYonly).S
  }))
  fmt.Println("5datalen=", len(st.data))
}

func dataHandlerGen() func(http.ResponseWriter, *http.Request) {

  st := NewState(jsonWords)

  return func(w http.ResponseWriter, req *http.Request) {
    defer func() {
      if r := recover(); r != nil {
        fmt.Println(r)
        fmt.Println("Recovered in 'handler'", r)
      }
    }()

    path := req.URL.Path
    rangeText := strings.Split(path, "/")

    if rangeText[2] == "reweight" {
      st.Rescore(rangeText[3:])
      return
    } else if rangeText[2] == "follow" {
      wordNames := strings.Split(rangeText[3], ",")
      bestYear := st.BestYearForFollowed(wordNames)
      w.Write([]byte(strconv.Itoa(bestYear)))
      return
    }

    axesAndParams := rangeText[2:5]

    data := st.DataFor(axesAndParams)

    lower, err := strconv.Atoi(rangeText[5])
    if err != nil {
      panic(err)
    }
    numWanted, err := strconv.Atoi(rangeText[6])
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

func getMaxWeights() Weights {
  w := Weights{}
  w.Length = 12 * 1.333333
  w.Count = 1e7 * .15256 * 430
  w.Pages = 1e7 * 2.7316
  w.Books = 1e5 * 6.6948 * 0.162
  w.PageDen = 17 * 1.05334 * 1.123
  w.Temp = 1
  w.BookDen = w.PageDen / 200 //TODO: WHAT IS A GOOD MAX WEIGHT FOR BOOKDENSITY??
  return w
}

func wordMapFor(wlist []*Word) map[string]*Word {
  words := map[string]*Word{}
  for _, w := range wlist {
    words[w.T] = w
  }
  return words
}

func sum(scores []float32) float32 {
  var tot float32 = 0
  for _, val := range scores {
    tot += val
  }
  return tot
}

func paramFuncFor(name , year string) func(*Word) float32 {
  var f func(*Word) float32
  switch name {
    case "pden":
      f = Pden(year)
    case "bks":
      f = Bk(year)
    case "cnt":
      f = Cnt(year)
    case "tmp":
      f = Tmp(year)
    case "wlen":
      f = Wlen(year)
    case "bden":
      f = Bden(year)
    case "pgs":
      f = Pg(year)
    default:
      panic("Invalid var name '" + name + "'")
  }
  return f
}

