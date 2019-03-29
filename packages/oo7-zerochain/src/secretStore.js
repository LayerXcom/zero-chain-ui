const { Bond } = require('oo7')
const nacl = require('tweetnacl');
const { generateMnemonic, mnemonicToSeed } = require('bip39')
const { ss58Encode } = require('./ss58')
const { AccountId } = require('./types')
const { bytesToHex, hexToBytes } = require('./utils')
const { gen_account_id, sign, gen_bdk, verify, gen_rsk, gen_rvk } = require('zerochain-wasm-utils')

let cache = {}

function seedFromPhrase(phrase) {
	if (!cache[phrase]) {
		cache[phrase] = phrase.match(/^0x[0-9a-fA-F]{64}$/)
			? hexToBytes(phrase)
			: new Uint8Array(mnemonicToSeed(phrase).slice(0, 32))
	}
	return cache[phrase]
}

class SecretStore extends Bond {
	constructor(storage) {
		super()
		this._storage = storage || typeof localStorage === 'undefined' ? {} : localStorage
		this._keys = []
		this._load()
		this.getIvk()
	}

	submit(phrase, name) {
		this._keys.push({ phrase, name })
		this._sync()
		return this.accountFromPhrase(phrase)
	}

	accountFromPhrase (phrase) {		
		return new AccountId(gen_account_id((seedFromPhrase(phrase))))
	}	

	seedFromAccount (account) {
		let item = this.find(account)
		if (item) {
			return item.seed
		}
		return null
	}

	rvkFromAccount (account) {	
		let item = this.find(account)
		if (item) {
			return gen_rvk(item.seed)
		}
		return null			
	}

	rskFromAccount (account) {
		let item = this.find(account)
		if (item) {
			return gen_rsk(item.seed)
		}
		return null
	}	

	accounts () {
		return this._keys.map(k => k.account)
	}

	find (identifier) {		
		if (this._keys.indexOf(identifier) !== -1) {					
			return identifier
		}
		if (identifier instanceof Uint8Array && identifier.length == 32 || identifier instanceof AccountId) {
			identifier = new AccountId(identifier)			
			identifier = ss58Encode(identifier)
		}
		return this._byAddress[identifier] ? this._byAddress[identifier] : this._byName[identifier]
	}

	getIvk(who) {		
		let item = this.find(who)
		if (item) {			
			let ivk = gen_bdk(item.seed)			
			return Uint8Array.from(ivk)
		}		
		return null
	}

	sign (from, data) {
		let item = this.find(from)		
		if (item) {
			console.info(`Signing data from ${item.name}`, bytesToHex(data))			
			let seed = new Uint32Array(8);
			self.crypto.getRandomValues(seed);
			
			let rsk = gen_rsk(item.seed)
			let rvk = gen_rvk(item.seed)

			let sig = sign(rsk, data, seed)  
			console.info(`Signature is ${bytesToHex(sig)}`)
			if (!verify(rvk, data, sig)) {   
				console.warn(`Signature is INVALID!`)
				return null
			}
			return [sig, rvk]
		}
		return null
	}

	forget(identifier) {
		let item = this.find(identifier)
		if (item) {
			console.info(`Forgetting key ${item.name} (${item.address}, ${item.phrase})`)
			this._keys = this._keys.filter(i => i !== item)
			this._sync()
		}
	}

	_load() {
		if (this._storage.secretStore) {
			this._keys = JSON.parse(this._storage.secretStore).map(({ seed, phrase, name }) => ({ phrase, name, seed: hexToBytes(seed) }))
		} else if (this._storage.secretStore2) {
			this._keys = JSON.parse(this._storage.secretStore2).map(({ seed, name }) => ({ phrase: seed, name }))
		} else {			
			this._keys = [
				{
					name: 'Alice',
					phrase: "0x416c696365202020202020202020202020202020202020202020202020202020"
				},
				{
					name: 'Bob',
					phrase: "0x426f622020202020202020202020202020202020202020202020202020202020"
				}
			]
		}
		this._sync()
	}

	_sync() {
		let byAddress = {}
		let byName = {}
		this._keys = this._keys.map(({ seed, phrase, name, key }) => {
			seed = seed || seedFromPhrase(phrase)
			// key = key || nacl.sign.keyPair.fromSeed(seed)			
			key = key || gen_account_id(seed)
			// console.log(`key: ${key}`)			
			let account = new AccountId(key)
			let address = ss58Encode(account)
			let item = { seed, phrase, name, key, account, address }
			byAddress[address] = item
			byName[name] = item
			return item
		})
		this._byAddress = byAddress
		this._byName = byName
		this._storage.secretStore = JSON.stringify(this._keys.map(k => ({ seed: bytesToHex(k.seed), phrase: k.phrase, name: k.name })))
		this.trigger({ keys: this._keys, byAddress: this._byAddress, byName: this._byName })
	}
}

let s_secretStore = null;

function secretStore(storage) {
	if (s_secretStore === null) {
		s_secretStore = new SecretStore(storage);
	}
	return s_secretStore;
}

module.exports = { secretStore, SecretStore };
