use odra::prelude::*;
use odra::casper_types::U256;
use odra::{Address, Mapping, Variable};

#[odra::odra_type]
pub struct RateEntry {
    pub rate: U256,
    pub bid: U256,
    pub ask: U256,
    pub timestamp: u64,
}

#[odra::module]
pub struct FXOracle {
    rates: Mapping<String, RateEntry>,
    pair_count: Variable<u64>,
    owner: Variable<Address>,
}

#[odra::module]
impl FXOracle {
    pub fn init(&mut self) {
        self.owner.set(self.env().caller());
        self.pair_count.set(0);
    }

    pub fn publish_rate(&mut self, pair: String, rate: U256, bid: U256, ask: U256) {
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        if caller != owner {
            self.env().revert(1u16);
        }
        let ts = self.env().block_time() / 1000;
        self.rates.set(
            &pair,
            RateEntry {
                rate,
                bid,
                ask,
                timestamp: ts,
            },
        );
    }

    pub fn get_rate(&self, pair: String) -> Option<RateEntry> {
        self.rates.get(&pair)
    }

    pub fn get_owner(&self) -> Option<Address> {
        self.owner.get()
    }

    pub fn transfer_ownership(&mut self, new_owner: Address) {
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        if caller != owner {
            self.env().revert(1u16);
        }
        self.owner.set(new_owner);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostRef};

    #[test]
    fn test_publish_and_get_rate() {
        let env = odra_test::env();
        let mut contract = FXOracle::deploy(&env, NoArgs);
        let pair = "EUR/USD".to_string();
        let rate = U256::from(106_000_000u64);
        let bid = U256::from(105_990_000u64);
        let ask = U256::from(106_010_000u64);
        contract.publish_rate(pair.clone(), rate, bid, ask);
        let entry = contract.get_rate(pair);
        assert!(entry.is_some());
        let e = entry.unwrap();
        assert_eq!(e.rate, rate);
        assert_eq!(e.bid, bid);
        assert_eq!(e.ask, ask);
    }
}
