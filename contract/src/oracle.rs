use odra::prelude::*;

#[odra::odra_type]
pub struct RateEntry {
    pub rate: u64,
    pub bid: u64,
    pub ask: u64,
    pub timestamp: u64,
}

#[odra::module(errors = OracleError)]
pub struct FXOracle {
    owner: Var<Address>,
    rates: Mapping<String, RateEntry>,
}

#[odra::odra_error]
pub enum OracleError {
    NotOwner = 1,
}

#[odra::module]
impl FXOracle {
    pub fn init(&mut self) {
        self.owner.set(self.env().caller());
    }

    pub fn publish_rate(&mut self, pair: String, rate: u64, bid: u64, ask: u64) {
        self.assert_owner();
        let ts = self.env().get_block_time();
        self.rates.set(&pair, RateEntry { rate, bid, ask, timestamp: ts });
    }

    pub fn get_rate(&self, pair: String) -> Option<RateEntry> {
        self.rates.get(&pair)
    }

    pub fn get_owner(&self) -> Option<Address> {
        self.owner.get()
    }

    pub fn transfer_ownership(&mut self, new_owner: Address) {
        self.assert_owner();
        self.owner.set(new_owner);
    }

    fn assert_owner(&self) {
        let caller = self.env().caller();
        match self.owner.get() {
            Some(owner) if owner == caller => {}
            _ => self.env().revert(OracleError::NotOwner),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::oracle::FXOracle;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn test_publish_and_get_rate() {
        let env = odra_test::env();
        let mut contract = FXOracle::deploy(&env, NoArgs);
        let pair = String::from("EUR/USD");
        contract.publish_rate(pair.clone(), 106_000_000, 105_990_000, 106_010_000);
        let entry = contract.get_rate(pair);
        assert!(entry.is_some());
        let e = entry.unwrap();
        assert_eq!(e.rate, 106_000_000);
    }
}
