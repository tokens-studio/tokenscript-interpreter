;; Run with (after building):
;; npm run build
;; bun run --bun nbb nrepl-server
;; Sadly cant use bun module for native api...
;; or to inspect with deno:
;; deno -A --unstable-node-globals --unstable-sloppy-imports --inspect jsr:@babashka/nbb nrepl-server
(ns repl
  (:require
   ["child_process" :as cp]
   ["fs" :as fs]
   [clojure.string :as str]))

;; Imports ---------------------------------------------------------------------

(require
 '["./dist/lib/index.js" :refer [Lexer Interpreter Parser Config ColorManager StringSymbol NullSymbol]]
 :reload)

;; Runner ----------------------------------------------------------------------

(defonce !result (atom nil))

(defn show-object [obj]
  (if (:error obj)
    obj
    (try
      (js->clj (js/Object.assign #js {} obj))
      (catch :default _ obj))))

(defn run
  ([code]
   (run code {}))
  ([code opts]
   (try
     (let [lexer (Lexer. code)
           parser (Parser. lexer)
           interpreter (Interpreter. parser (clj->js opts))
           result (.interpret interpreter)]
       (reset! !result #js {:lexer lexer
                            :parser parser
                            :interpreter interpreter
                            :result result})
       result)
     (catch js/Error e e))))

(defn run-python! [code]
  (let [proc (cp.spawnSync (str "docker run -i ts-design-tokens-interpreter run \"" code "\"")
                           (clj->js
                            {:cwd "/home/floscr/Code/Work/Hyma/prototype-tokens-interpreter-py"
                             :shell true
                             :stdio "pipe"
                             :encoding "utf8"}))]
    (if (.-stderr proc)
      (->> (.-output proc)
           (str/join "")
           (str/trim-newline))
      proc)))

(defn run* [code]
  (let [js (try (-> (run code) (.toString))
                (catch :default e e))
        py (run-python! code)]
    {:js js
     :py py}))

;; Colors ----------------------------------------------------------------------

(defn setup-color-manager [uris]
  (let [cm (ColorManager.)]
    (doseq [[uri path] uris]
      (let [spec (-> (fs/readFileSync path "utf-8")
                     (js/JSON.parse))]
        (.register cm uri spec)))
    cm))

(defn run-with-colormanager
  [code & {:as opts :keys [references schema-uris]}]
  (try
    (let [lexer (Lexer. code)
          parser (Parser. lexer)
          color-manager (setup-color-manager (or schema-uris
                                                 {"https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/" "./data/specifications/colors/rgb.json"}))
          config  (Config. #js {:colorManager color-manager})
          interpreter (Interpreter. parser #js {:config config
                                                :references (some-> references (clj->js))})
          result (.interpret interpreter)]
      (reset! !result #js {:config config
                           :lexer lexer
                           :parser parser
                           :interpreter interpreter
                           :result result})
      result)
    (catch :default e {:error e
                       :meta (.-meta e)})))

(def schemas
  {"https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/" "./data/specifications/colors/rgb.json"
   "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/" "./data/specifications/colors/srgb.json"
   "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/" "./data/specifications/colors/hsl.json"})

(comment
  (group-by)
  (run "variable x: List = 1 2 3; x")
  (.toString (js/Error. "Foo"))
  nil)

(comment
  (run "1rem + 10% + 1px")
  (run-python! "variable x: Color.rgb;")
  (-> (run "variable color: Color = #FF5733;
return color;
")
      show-object
      (update-in ["meta" "constructorSymbol"] show-object)
      (update-in ["meta" "valueSymbol"] show-object))
  ;; => Could not resolve symbol: run
  (run-python! "variable hello: String = 'HELLO';
variable world: String = 'world';
variable result: String = hello.lower();
variable result2: String = world.upper();
variable result3: String = hello world;
")

  (-> (run "variable x: Number = \"string\";
x")
      show-object)


  (run "variable my_dict: Dictionary;
variable value: String = my_dict.get('nonexistent');
value = 'foo';
return value;")

  (run "variable my_dict: Dictionary;
        variable value: String = my_dict.get('nonexistent');
        return value;")
  ;; => "Value must be int or float, got <class 'NoneType'>."

  (run "variable c: Dictionary;
variable foo: Dictionary = c.get(\"foo\");
return foo")
  ;; => #object[_DictionarySymbol {}]

  (run "variable c: Dictionary;
c.get(\"foo\");
")

  (run "variable c: Dictionary;
variable foo: String = c.get(\"foo\");
return foo")
  ;; => #object[_StringSymbol null]

  (run-python! "variable c: Dictionary;
variable foo: List = c.get(\"foo\");
return foo")
  ;; => ""

  (run-python! "variable c: Dictionary;
variable foo: String = c.get(\"foo\");
foo = 'bar';
return foo")
  ;; => "bar"

  (run-python! "variable c: Dictionary;
variable foo: String = c.get(\"foo\");
foo.concat(\"bar\");
return foo")

  (run-python! "variable c: Dictionary;
variable foo: String = c.get(\"foo\");
foo = \"bar\";
return foo")

  (run-python! "variable c: Dictionary;
c.get(\"foo\") + 1
"))
