(module
  (import "env" "casper_new_uref" (func $new_uref (param i32 i32 i32)))
  (import "env" "casper_put_key"  (func $put_key  (param i32 i32 i32 i32)))

  (memory (export "memory") 1)

  ;; 0x00: name as Casper serialized String: [09 00 00 00] + "fx_oracle" = 13 bytes
  (data (i32.const 0x00) "\09\00\00\00fx_oracle")

  ;; 0x10: CLValue::Unit = [00 00 00 00 09]  (data_len=0, CLType::Unit=9)
  (data (i32.const 0x10) "\00\00\00\00\09")

  ;; 0x20: output buffer for URef address (32 bytes, written by casper_new_uref)
  ;; 0x40: Key::URef header: tag=0x02
  (data (i32.const 0x40) "\02")
  ;; 0x41-0x60: URef address (32 bytes, copied from 0x20)
  ;; 0x61: access rights = 0x07 (READ_ADD_WRITE)
  (data (i32.const 0x61) "\07")

  (func (export "call")
    ;; casper_new_uref(output_buf=0x20, clval_ptr=0x10, clval_size=5)
    (call $new_uref (i32.const 0x20) (i32.const 0x10) (i32.const 5))

    ;; Copy 32-byte URef address from 0x20 -> 0x41 (8 x 4-byte stores)
    (i32.store (i32.const 0x41) (i32.load (i32.const 0x20)))
    (i32.store (i32.const 0x45) (i32.load (i32.const 0x24)))
    (i32.store (i32.const 0x49) (i32.load (i32.const 0x28)))
    (i32.store (i32.const 0x4D) (i32.load (i32.const 0x2C)))
    (i32.store (i32.const 0x51) (i32.load (i32.const 0x30)))
    (i32.store (i32.const 0x55) (i32.load (i32.const 0x34)))
    (i32.store (i32.const 0x59) (i32.load (i32.const 0x38)))
    (i32.store (i32.const 0x5D) (i32.load (i32.const 0x3C)))

    ;; casper_put_key(name_ptr=0x00, name_size=13, key_ptr=0x40, key_size=34)
    ;; name: 4-byte LE length (9) + "fx_oracle" = 13 bytes
    ;; key:  raw Key::URef [tag(1) + addr(32) + rights(1)] = 34 bytes
    (call $put_key
      (i32.const 0x00) (i32.const 13)
      (i32.const 0x40) (i32.const 34)
    )
  )
)