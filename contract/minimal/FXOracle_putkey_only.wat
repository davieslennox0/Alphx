;; Test: casper_put_key only, hardcoded URef address (no casper_new_uref)
;; Isolates whether the error is in casper_new_uref or casper_put_key

(module
  (import "env" "casper_put_key" (func $put_key (param i32 i32 i32 i32)))

  (memory (export "memory") 1)

  ;; Key::URef at 0x00:
  ;;   0x00: tag 0x02 (Key::URef)
  ;;   0x01-0x20: 32-byte URef address (hardcoded zeros)
  ;;   0x21: access rights 0x07
  (data (i32.const 0x00) "\02\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\07")

  ;; "fx_oracle" at 0x30
  (data (i32.const 0x30) "fx_oracle")

  (func (export "call")
    (call $put_key
      (i32.const 0x30)  ;; name_ptr
      (i32.const 9)     ;; name_size
      (i32.const 0x00)  ;; key_ptr
      (i32.const 34)    ;; key_size
    )
  )
)
