
package main

import (
  "io"
  "io/ioutil"
  "fmt"
  "net/http"
  "bytes"
)

func main() {
  fmt.Println("Starting http server...")
  indexHandler := staticFileHandler("index.html")
  http.HandleFunc("/", indexHandler)
  err := http.ListenAndServe(":8080", nil)
  if err != nil {
    fmt.Println(err)
  }
}


func  staticFileHandler(file_name string) func(http.ResponseWriter,
                                               *http.Request) {

  file_data, _ := ioutil.ReadFile(file_name)
  buffer := bytes.NewBuffer(file_data)
  html_content := buffer.String()

  return func(w http.ResponseWriter, req *http.Request) {

    fmt.Println("New Request")
    io.WriteString(w, html_content)
  }
}

func sayHello(w http.ResponseWriter, req *http.Request) {
}

