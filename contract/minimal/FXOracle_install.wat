;; FXOracle Install — Casper 2.0 contract install
;;
;; Creates a URef via casper_new_uref and stores it as the named key
;; "fx_oracle" under the deployer's account. The URef address becomes
;; the on-chain oracle reference (ORACLE_CONTRACT_HASH).
;;
;; No bulk-memory instructions — compatible with Casper 2.0 (Condor) VM.
;;
;; Memory layout:
;;   0x00 - 0x04 : CLValue Unit bytes  = [00 00 00 00 0F]
;;   0x10 - 0x2F : URef address output (32 bytes, written by casper_new_uref)
;;   0x30        : Key::URef tag = 0x03
;;   0x31 - 0x50 : URef address copy   (32 bytes, copied from 0x10)
;;   0x51        : Access rights = 0x07 (READ_ADD_WRITE)
;;   0x60 - 0x68 : "fx_oracle" (9 bytes)

(module
  (import "env" "casper_new_uref" (func $new_uref (param i32 i32 i32)))
  (import "env" "casper_put_key"  (func $put_key  (param i32 i32 i32 i32)))

  (memory (export "memory") 1)

  ;; Static data
  (data (i32.const 0x00) "\00\00\00\00\0F")  ;; CLValue Unit (4-byte len=0 + type Unit=15)
  (data (i32.const 0x30) "\02")               ;; Key::URef tag (Key enum position 2)
  (data (i32.const 0x51) "\07")               ;; URef access rights READ_ADD_WRITE
  (data (i32.const 0x60) "fx_oracle")         ;; Named key label (9 bytes)

  (func (export "call")
    ;; Create a new URef backed by a Unit value
    ;; casper_new_uref(uref_addr_out, cl_value_ptr, cl_value_size)
    (call $new_uref
      (i32.const 0x10)  ;; output: 32-byte URef address written here
      (i32.const 0x00)  ;; CLValue Unit bytes
      (i32.const 5)     ;; size of CLValue Unit = 5 bytes
    )

    ;; Copy 32-byte URef address from 0x10 → 0x31 (no bulk-memory, 8×4-byte loads)
    (i32.store (i32.const 0x31) (i32.load (i32.const 0x10)))
    (i32.store (i32.const 0x35) (i32.load (i32.const 0x14)))
    (i32.store (i32.const 0x39) (i32.load (i32.const 0x18)))
    (i32.store (i32.const 0x3D) (i32.load (i32.const 0x1C)))
    (i32.store (i32.const 0x41) (i32.load (i32.const 0x20)))
    (i32.store (i32.const 0x45) (i32.load (i32.const 0x24)))
    (i32.store (i32.const 0x49) (i32.load (i32.const 0x28)))
    (i32.store (i32.const 0x4D) (i32.load (i32.const 0x2C)))

    ;; Store named key "fx_oracle" → Key::URef at 0x30 (34 bytes: tag + 32-byte addr + rights)
    (call $put_key
      (i32.const 0x60)  ;; name_ptr  "fx_oracle"
      (i32.const 9)     ;; name_size
      (i32.const 0x30)  ;; key_ptr   Key::URef [tag | addr | rights]
      (i32.const 34)    ;; key_size  1 + 32 + 1
    )
  )
)
