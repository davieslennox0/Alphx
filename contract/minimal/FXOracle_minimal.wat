;; FXOracle Minimal — Casper 2.0 compatible install entry point
;;
;; The full Odra-compiled FXOracle.wasm uses bulk-memory operations that the
;; Casper 2.0 (Condor) VM doesn't yet support. This hand-written WAT module
;; compiles to a WASM that has ZERO bulk-memory instructions and zero sign-ext
;; instructions, making it deployable on the Casper 2.0 testnet.
;;
;; On-chain effect:
;;   - Registers the named key "alphx_oracle" pointing to a Hash(0x000...0)
;;     in the deployer account's named keys.
;;   - Once Casper 2.0 gains bulk-memory support (or an Odra update removes
;;     the dependency), the full FXOracle.wasm will be deployed as an upgrade.
;;
;; Build:
;;   wasm-as contract/minimal/FXOracle_minimal.wat \
;;     -o contract/wasm/FXOracle_deploy.wasm

(module
  ;; ── Host function imports ──────────────────────────────────────────────────
  ;;
  ;; casper_put_key(name_ptr, name_size, key_ptr, key_size)
  ;;   Writes a named key into the calling account / contract's named-key map.
  ;;   key_ptr must point to a CLType-serialized Key value.
  (import "env" "casper_put_key" (func $put_key (param i32 i32 i32 i32)))

  ;; casper_revert(status)
  ;;   Aborts execution with a non-zero status code.
  (import "env" "casper_revert"  (func $revert  (param i32)))

  ;; ── Memory (required by Casper host) ──────────────────────────────────────
  (memory (export "memory") 1)

  ;; ── Static data ───────────────────────────────────────────────────────────
  ;;
  ;; Named key label stored at offset 0, length 12 bytes.
  (data (i32.const 0)  "alphx_oracle")

  ;; CLType-serialised Key::Hash at offset 16.
  ;; Format: 1-byte discriminant (0x01 = Hash) + 32-byte HashAddr (all zeros).
  ;; Total: 33 bytes.  All-zero hash is a valid HashAddr for the purpose of
  ;; staking a named key slot; it will be overwritten when the full contract
  ;; is deployed via upgrade.
  (data (i32.const 16)
    "\01"                                                ;; Key::Hash discriminant
    "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00"  ;; hash bytes 0-15
    "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00"  ;; hash bytes 16-31
  )

  ;; ── Install entry point ───────────────────────────────────────────────────
  ;;
  ;; Casper executes the exported "call" function when the transaction is
  ;; processed.  This function writes one named key and returns.
  (func (export "call")
    (call $put_key
      (i32.const 0)   ;; name_ptr  → "alphx_oracle"
      (i32.const 12)  ;; name_size = 12
      (i32.const 16)  ;; key_ptr   → Key::Hash(0x000...0)
      (i32.const 33)  ;; key_size  = 1 (discriminant) + 32 (hash)
    )
  )
)
