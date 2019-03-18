const { Bond } = require('oo7')
const nacl = require('tweetnacl');
const { generateMnemonic, mnemonicToSeed } = require('bip39')
const { ss58Encode } = require('./ss58')
const { AccountId } = require('./types')
const { bytesToHex, hexToBytes } = require('./utils')
const { gen_account_id, sign, gen_ivk, verify } = require('zerochain-wasm-utils')

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
	constructor (storage) {
		super()
		this._storage = storage || typeof localStorage === 'undefined' ? {} : localStorage
		this._keys = []
		this._load()
		this.getIvk()
	}

	submit (phrase, name) {
		this._keys.push({phrase, name})
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

	accounts () {
		return this._keys.map(k => k.account)
	}

	find (identifier) {
		// console.log(`tmp1: ${identifier}`)
		if (this._keys.indexOf(identifier) !== -1) {					
			return identifier
		}
		if (identifier instanceof Uint8Array && identifier.length == 32 || identifier instanceof AccountId) {
			identifier = new AccountId(identifier)
			// console.log(`tmp2: ${identifier}`)
			identifier = ss58Encode(identifier)
		}
		return this._byAddress[identifier] ? this._byAddress[identifier] : this._byName[identifier]
	}

	getIvk(who) {		
		let item = this.find(who)
		if (item) {			
			let ivk = gen_ivk(item.seed)
			console.log(Uint8Array.from(ivk))
			return Uint8Array.from(ivk)
		}
		console.log("c!")
		return null
	}

	sign (from, data) {
		let item = this.find(from)
		console.log(`item: ${item}`)
		if (item) {
			console.info(`Signing data from ${item.name}`, bytesToHex(data))
			// let sig = nacl.sign.detached(data, item.key.secretKey)
			let seed = new Uint32Array(8);
			self.crypto.getRandomValues(seed);
			// let sig = sign(item.seed, data, seed)  // Change item.seed to ask
			let rsk = hexToBytes("0xdcfd7a3cb8291764a4e1ab41f6831d2e285a98114cdc4a2d361a380de0e3cb07")
			let rvk = hexToBytes("0x791b91fae07feada7b6f6042b1e214bc75759b3921956053936c38a95271a834")
			let sig = sign(rsk, data, seed)  // Change item.seed to ask
			console.info(`Signature is ${bytesToHex(sig)}`)
			if (!verify(rvk, data, sig)) {   // Change item.key to rk
				console.warn(`Signature is INVALID!`)
				return null
			}
			return sig
		}
		return null
	}

	forget (identifier) {
		let item = this.find(identifier)
		if (item) {
			console.info(`Forgetting key ${item.name} (${item.address}, ${item.phrase})`)
			this._keys = this._keys.filter(i => i !== item)
			this._sync()
		}
	}

	_load () {
		if (this._storage.secretStore) {
			this._keys = JSON.parse(this._storage.secretStore).map(({seed, phrase, name}) => ({ phrase, name, seed: hexToBytes(seed) }))
		} else if (this._storage.secretStore2) {
			this._keys = JSON.parse(this._storage.secretStore2).map(({seed, name}) => ({ phrase: seed, name }))
		} else {
			this._keys = [{
				name: 'Default',
				phrase: generateMnemonic()
			}]
		}
		this._sync()
	}

	_sync () {
		let byAddress = {}
		let byName = {}
		this._keys = this._keys.map(({seed, phrase, name, key}) => {
			seed = seed || seedFromPhrase(phrase)
			// key = key || nacl.sign.keyPair.fromSeed(seed)			
			key = key || gen_account_id(seed)
			// console.log(`key: ${key}`)			
			let account = new AccountId(key)
			let address = ss58Encode(account)
			let item = {seed, phrase, name, key, account, address}
			byAddress[address] = item
			byName[name] = item
			return item
		})
		this._byAddress = byAddress
		this._byName = byName
		this._storage.secretStore = JSON.stringify(this._keys.map(k => ({seed: bytesToHex(k.seed), phrase: k.phrase, name: k.name})))
		this.trigger({keys: this._keys, byAddress: this._byAddress, byName: this._byName})
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
