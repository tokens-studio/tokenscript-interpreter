;; Run with
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
 '["./interpreter/lexer.ts" :refer [Lexer]]
 '["./interpreter/interpreter.ts" :refer [Interpreter]]
 '["./interpreter/parser.ts" :refer [Parser]]
 '["./interpreter/config/config.ts" :refer [Config]]
 '["./interpreter/symbols.ts"]
 '["./interpreter/config/managers/color/manager.ts" :refer [ColorManager]]
 :reload)

;; Runner ----------------------------------------------------------------------

(defonce !result (atom nil))

;; (js/console.log @!result)

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

(comment
  (run-python! "variable foo: List = 1 1;
foo")
  (js/console.log "FOo")

  (run "variable foo: Color.foo;
foo")

  (-> (run "variable foo: Color.Hex = #333;
foo")
      (.-subType))

  (run "variable foo: String;
foo = '1';
foo")


  (run-python! "variable radix: Number;
variable c: Number = 1;
c.toString(radix)")

  nil)


(comment
  (run-python! "variable c: Color.Hex = #ff0000;
c")
  (run "variable c: Color.Hex = #ff0000;
c")
  ;; => {:js "1 0 0", :py "1.0 0 0"}

  (run "variable c: String
c")

  (run-python! "variable c: Color.Hex
c")

  (run* "variable c: Color.Hex = '#ffffff';
c")

  (run* "variable c: Color.Hex = '#ffffff';
variable v: Color.Hex = c;
v")

  (run* "1 + 1.0")
  ;; => {:js "2", :py "2.0"}

  (run* "pow(((255 / 255) + 0.055) / 1.055, 2.4)")

  (run* "variable rgb: List = 255, 0, 0;
    variable rgb_linear: List = 0, 0, 0;
    variable gamma: Number = 2.4;

    // Convert RGB to linear RGB
    variable r: Number = rgb.get(0) / 255;
    variable g: Number = rgb.get(1) / 255;
    variable b: Number = rgb.get(2) / 255;

    // Process red channel
    if(r <= 0.03928) [
        rgb_linear.update(0, r / 12.92);
    ] else [
        rgb_linear.update(0, pow((r + 0.055) / 1.055, gamma));
    ];

    // Process green channel
    if(g <= 0.03928) [
        rgb_linear.update(1, g / 12.92);
    ] else [
        rgb_linear.update(1, pow((g + 0.055) / 1.055, gamma));
    ];

    // Process blue channel
    if(b <= 0.03928) [
        rgb_linear.update(2, b / 12.92);
    ] else [
        rgb_linear.update(2, pow((b + 0.055) / 1.055, gamma));
    ];

    return rgb_linear;")

  (run "variable a: Number = 1;
a.toString(16)")

  (run-python! "variable a: Number = 1;
a.toString(16)")

  (run* "variable a: None")

  (run* "variable a: Color.Hex = #333;
a")

  (run* "variable a: List = 1, 2 3;
a")

  (run* "variable a: List = 1 2 3;
a")

  (run* "variable a: List = 1 2;
a")
  (run "variable a: List = 1 2;")


  (run* "1; return 2; 3;")

  (run* "b = 2")
  (run "variable f-a: Number = 1; return f-a;")

  (run "variable f-a: Number = 1;
return f-a")


  (run-python! "variable i;")

  (run* "variable i: lol = 1;
return i;")

  (run-python! "variable i: Number = '1';
return i;")
  ;; => "Line 1: Invalid value '1' ('number') for variable 'i'. Use a valid value.\nNear token: ="

  (run* "variable i: Number;
i = \"1\";
return i;")
  ;; => "Line 1: Invalid value '1' ('number') for variable 'i'. Use a valid value.\nNear token: ="

  (run* "variable i: String = 1;
return i;")

  ;; => "Error: Command failed: docker run -i ts-design-tokens-interpreter run \"1 + '1'\""

  ;; Weird edge-cases / implementation decisions ---------------------------------

  ;; List eats newline
  (run "variable i: Number = 1;
1
i")

  (run "\"Some
multiline
⛥👭
string\"")

  ;; Spaces inside references
  (run "{    foo   .    bar    }" {:foo.bar 10})

  (run "\"foo'")

  ;; Playground ------------------------------------------------------------------

  (run "
variable i: NumberWithUnit = 0px;
variable j: Number = 0;
while(i < 3) [
   j = 0;
   while(j < 2) [
       j = j + 1;
   ];
   i = i + 1;
];
return i j;
")

  (run "
variable i: NumberWithUnit = 0px;
variable j: Number = 0;
while(i < 3) [
   variable j: Number = 0;
   j = i;
   i = i + 1;
];
return j;
")

  nil)

;; Colors ----------------------------------------------------------------------

(defn setup-color-manager []
  (let [uri "./specifications/colors/rgb.json"
        cm (ColorManager.)
        spec (-> (fs/readFileSync uri "utf-8")
                 (js/JSON.parse))]
    (.register cm uri spec)
    cm))

(defn run-with-colormanager
  [code & {:as opts}]
  (try
    (let [lexer (Lexer. code)
          parser (Parser. lexer)
          color-manager (setup-color-manager)
          config  (Config. #js {:colorManager color-manager})
          interpreter (Interpreter. parser #js {:config config})
          result (.interpret interpreter)]
      (reset! !result #js {:config config
                           :lexer lexer
                           :parser parser
                           :interpreter interpreter
                           :result result})
      result)
    (catch :default e {:error e
                       :meta (.-meta e)})))

(comment
  (run-with-colormanager
   "variable c: Color.Rgb = rgb(255, 255, 255);
c.to.hex()")
  ;; => #object[ColorSymbol #ffffff]

  (run-with-colormanager
   "variable c: Color.Rgb = rgb(255, 255);")
  ;; => {:error
  ;;     #object[InterpreterError InterpreterError: Index out of range for get.],
  ;;     :meta nil}

  (run-with-colormanager
   "variable c: Color.Hex = #FFF;
variable f: Color.Hex = c.to.hex();
variable s: Color.Rgb = f.to.rgb();
s")
  ;; => #object[ColorSymbol #FFF]

  (run-with-colormanager
   "variable c: Color.Hex = #FFF;
variable f: Color.Rgb = c.to.rgb();
f.r")

  (run-with-colormanager "variable c: Color.Rgb;
c.r = 255;
c.g = 255;
c.to.rgb()")

  (run-with-colormanager "variable c: Color.Rgb;
c.r = 255;
c.g = 255;
c.b = 255;
c.r")
  ;; => #object[NumberSymbol 255]

  (run-with-colormanager "variable c: Color.Rgb;
c.r = 255;
c.to.hex()")
  ;; => {:error
  ;;     #object[InterpreterError InterpreterError: Attribute 'g' not found on Color.],
  ;;     :meta nil}


  (-> (run-with-colormanager "variable c: Color.Rgb;
c.r = 255;
c.g = 255;
c.b = 255;
c.r")
      :meta
      .-config
      (doto js/console.log))
  nil)
