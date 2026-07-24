(module
  (import "env" "casper_new_uref" (func $new_uref (param i32 i32 i32)))
  (import "env" "casper_put_key"  (func $put_key  (param i32 i32 i32 i32)))

  (memory (export "memory") 1)

  ;; 0x00: name = [09 00 00 00] + "fx_oracle" (13 bytes)
  (data (i32.const 0x00) "\09\00\00\00fx_oracle")

  ;; 0x10: CLValue::Unit = [00 00 00 00 09] (5 bytes)
  (data (i32.const 0x10) "\00\00\00\00\09")

  ;; 0x20-0x40: casper_new_uref output (33 bytes written here at runtime):
  ;;   0x20-0x3F = 32-byte URef address
  ;;   0x40      = access rights (1 byte, written by new_uref)

  ;; 0x50: Key::URef tag [02] — assembled after new_uref returns
  (data (i32.const 0x50) "\02")
  ;; 0x51-0x70: URef address (32 bytes, copied from 0x20)
  ;; 0x71: access rights (1 byte, copied from 0x40)

  (func (export "call")
    ;; casper_new_uref writes 33 bytes to 0x20 (addr[32] + access_rights[1])
    (call $new_uref (i32.const 0x20) (i32.const 0x10) (i32.const 5))

    ;; Copy 32-byte URef address from 0x20 -> 0x51
    (i32.store (i32.const 0x51) (i32.load (i32.const 0x20)))
    (i32.store (i32.const 0x55) (i32.load (i32.const 0x24)))
    (i32.store (i32.const 0x59) (i32.load (i32.const 0x28)))
    (i32.store (i32.const 0x5D) (i32.load (i32.const 0x2C)))
    (i32.store (i32.const 0x61) (i32.load (i32.const 0x30)))
    (i32.store (i32.const 0x65) (i32.load (i32.const 0x34)))
    (i32.store (i32.const 0x69) (i32.load (i32.const 0x38)))
    (i32.store (i32.const 0x6D) (i32.load (i32.const 0x3C)))

    ;; Copy access rights byte from 0x40 -> 0x71
    (i32.store8 (i32.const 0x71) (i32.load8_u (i32.const 0x40)))

    ;; casper_put_key(name_ptr=0x00, name_size=13, key_ptr=0x50, key_size=34)
    (call $put_key
      (i32.const 0x00) (i32.const 13)
      (i32.const 0x50) (i32.const 34)
    )
  )
)