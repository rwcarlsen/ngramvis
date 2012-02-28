
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "os"
  "bufio"
  gosql "github.com/kuroneko/gosqlite3"
  "net/http"
)

func main() {
  fmt.Println("Starting http server...")
  indexHandler := staticFileHandler("index.html")

  http.HandleFunc("/", indexHandler)
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

func dataHandler(w http.ResponseWriter, req *http.Request) {
  path := req.URL.Path
  fmt.Fprintln(w, path)

  if path == "/data/set1" {
    words := loadWordData("/home/robert/grams1.csv")
    for _, elem := range words {
      fmt.Fprintln(w, &elem)
    }
  } else if path == "/data/set2" {
    words := loadWordData("/home/robert/grams2.csv")
    for _, elem := range words {
      fmt.Fprintln(w, &elem)
    }
  } else {
    myword := &Word{Text:"foo",Year:1980, BookCount:4, PageCount:56, Count:81}
    fmt.Fprintln(w, myword)
    fmt.Fprintln(w, myword.PageDensity())
  }
}

func loadWordData(file_name string) []Word {
  var words []Word

  file, err := os.Open(file_name)
  if err != nil {
    fmt.Println("Error: ", err)
    return words
  }

  reader := bufio.NewReader(file)
  max_words := 1000000
  for i := 0; i < max_words; i++ {
    line, _, err2 := reader.ReadLine()
    if err != nil {
      fmt.Println("Error: ", err2)
      break
    }
    pieces := strings.Split(string(line), "\t")

    wordText := pieces[0]
    year, _ := strconv.Atoi(pieces[1])
    count, _ := strconv.Atoi(pieces[2])
    pageCount, _ := strconv.Atoi(pieces[3])
    bookCount, _ := strconv.Atoi(pieces[4])

    myword := Word{wordText, year, count, pageCount, bookCount}
    words = append(words, myword)
  }
  return words
}

type Word struct {
  Text string
  Year int
  Count int
  PageCount int
  BookCount int
}

func (w *Word) PageDensity() float32 {
  return float32(w.Count) / float32(w.PageCount)
}

func (w *Word) String() string {
  str := w.Text
  str += " {BookCount = " + strconv.Itoa(w.BookCount)
  str += ", PageCount = " + strconv.Itoa(w.PageCount)
  str += ", Count = " + strconv.Itoa(w.Count)
  str += ", Year = " + strconv.Itoa(w.Year)
  str+= "}"
  return str
}

func loadSqliteData() {
  db, _ := gosql.Open("/home/robert/cycout/cyclus.sqlite")
  fmt.Println(db)
}

