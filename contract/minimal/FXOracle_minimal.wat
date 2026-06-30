;; FXOracle Minimal — Casper 2.0 compatible install entry point
;;
;; The full Odra-compiled FXOracle.wasm uses bulk-memory operations that the
;; Casper 2.0 (Condor) VM does not yet support.  This hand-written WAT module
;; compiles to 84 bytes and has ZERO bulk-memory instructions.
;;
;; Casper 2.0 Condor changed the AddressableEntity model and the host-function
;; interface for casper_put_key — calling it with the Casper 1.x Key::Hash
;; format causes a "Deserialization error: early end of stream" at runtime.
;; Rather than risk another runtime revert, the call() entry point here is a
;; clean no-op: the transaction lands on-chain successfully (execution_result
;; contains no error_message), proving the WASM runtime accepts our module.
;;
;; The named-key write and full oracle entry-points will be added once the
;; Casper 2.0 host-function ABI for AddressableEntity is documented.
;;
;; Build:
;;   wasm-as contract/minimal/FXOracle_minimal.wat \
;;     -o contract/wasm/FXOracle_deploy.wasm

(module
  ;; Memory is required by the Casper host environment
  (memory (export "memory") 1)

  ;; call() — the entry point Casper executes when the transaction is
  ;; processed.  Returns immediately with no side-effects.
  (func (export "call"))
)
