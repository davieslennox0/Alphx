;; FXOracle v2 — Casper 2.2.2 compatible
;;
;; Fix: casper_put_key in Casper 2.x takes length-prefixed serialized
;; strings/keys, not raw ptr+size. Both name and key are now wrapped
;; with a 4-byte LE length prefix (Casper bytesrepr Bytes format).
;;
;; Memory layout:
;;   0x00 - 0x0C : name = [09 00 00 00] + "fx_oracle" (4 + 9 = 13 bytes)
;;   0x10 - 0x29 : CLValue Unit = [00 00 00 00 0F] (5 bytes, for casper_new_uref)
;;   0x30 - 0x4F : URef address output (32 bytes, written by casper_new_uref)
;;   0x50 - 0x75 : key = [22 00 00 00] + [02] + 32-byte-addr + [07] (4+1+32+1 = 38 bytes)

(module
  (import "env" "casper_new_uref" (func $new_uref (param i32 i32 i32)))
  (import "env" "casper_put_key"  (func $put_key  (param i32 i32 i32 i32)))

  (memory (export "memory") 1)

  ;; name: 4-byte LE length (9) + "fx_oracle"
  (data (i32.const 0x00) "\09\00\00\00fx_oracle")

  ;; CLValue Unit (for casper_new_uref initial value)
  (data (i32.const 0x10) "\00\00\00\00\0F")

  ;; key header: 4-byte LE length (34) + Key::URef tag
  (data (i32.const 0x50) "\22\00\00\00\02")
  ;; access rights byte — at 0x75 (0x50+4+1+32), AFTER the URef address)
  (data (i32.const 0x75) "\07")

  (func (export "call")
    ;; Create URef with Unit initial value, output at 0x30
    (call $new_uref
      (i32.const 0x30)  ;; output: 32-byte URef address
      (i32.const 0x10)  ;; CLValue Unit bytes
      (i32.const 5)
    )

    ;; Copy 32-byte URef address from 0x30 to 0x55 (after the 4-byte length + tag at 0x50-0x54)
    (i32.store (i32.const 0x55) (i32.load (i32.const 0x30)))
    (i32.store (i32.const 0x59) (i32.load (i32.const 0x34)))
    (i32.store (i32.const 0x5D) (i32.load (i32.const 0x38)))
    (i32.store (i32.const 0x61) (i32.load (i32.const 0x3C)))
    (i32.store (i32.const 0x65) (i32.load (i32.const 0x40)))
    (i32.store (i32.const 0x69) (i32.load (i32.const 0x44)))
    (i32.store (i32.const 0x6D) (i32.load (i32.const 0x48)))
    (i32.store (i32.const 0x71) (i32.load (i32.const 0x4C)))

    ;; casper_put_key(name_ptr, name_size, key_ptr, key_size)
    ;; name: 13 bytes (4-byte len prefix + 9-byte string)
    ;; key:  38 bytes (4-byte len prefix + 34-byte Key::URef)
    (call $put_key
      (i32.const 0x00)  ;; name_ptr
      (i32.const 13)    ;; name_size
      (i32.const 0x50)  ;; key_ptr
      (i32.const 38)    ;; key_size
    )
  )
)
