
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "path"
  "net/http"
  "encoding/json"
  "launchpad.net/mgo"
)

const (
  dbServer = "localhost"
  dbName = "ngrams"
  collecName = "words"
)

const (
  cleanRaw = false
  ngramsDir = "/home/robert/ngrams"
  ngramsBase = "grams"
  ngramsExt = "csv"
  ngramsLow = 3
  ngramsHigh = 10
)

func main() {
  if cleanRaw {
    for i := ngramsLow; i <= ngramsHigh; i++ {
      fname := ngramsBase + strconv.Itoa(i) + "." + ngramsExt
      path := path.Join(ngramsDir, fname)
      CleanupRawWords(path)
    }
    return
  }

  session, err := mgo.Dial(dbServer)
  if err != nil {
    fmt.Println(err)
    return
  }
  defer session.Close()

  http.HandleFunc("/viz", indexHandler)
  http.HandleFunc("/viz/viz.js", vizScriptHandler)
  http.HandleFunc("/data/", dataHandlerGen(session))

  fmt.Println("Starting http server...")
  err = http.ListenAndServe("0.0.0.0:8888", nil)
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

func dataHandlerGen(session *mgo.Session) func(http.ResponseWriter, *http.Request) {
  collection := session.DB(dbName).C(collecName)

  return func(w http.ResponseWriter, req *http.Request) {
    defer func() {
      if r := recover(); r != nil {
        fmt.Println("Recovered in 'handler'", r)
      }
    }()

    path := req.URL.Path

    rangeText := strings.Split(path, "/")

    lower, err := strconv.Atoi(rangeText[2])
    if err != nil {
      panic(err)
    }
    numWanted, err := strconv.Atoi(rangeText[3])
    if err != nil {
      panic(err)
    }

    // allocate space for retrieved data
    data := make([]XYonly, numWanted)

    // query mongodb
    var result Word
    query := collection.Find(nil)
    query = query.Skip(lower)
    iter := query.Iter()
    for count := 0; count < numWanted; count++ {
      if ! iter.Next(&result) {
        break
      }
      data[count] = result.TotPgDenBkCnt()
    }
    if iter.Err() != nil {
      panic(iter.Err())
    }

    marshaled, err := json.Marshal(data)
    if err != nil {
      panic(err)
    }
    _, _ = w.Write(marshaled)
  }
}

