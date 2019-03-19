import React from 'react';
import {Bond} from 'oo7';
import {ReactiveComponent, Rimg} from 'oo7-react';
import Identicon from 'polkadot-identicon'; // default
import {Label, Input} from 'semantic-ui-react';
import InputBond from './InputBond';
import nacl from 'tweetnacl';
import {stringToSeed, hexToBytes, bytesToHex, runtime, secretStore, addressBook, ss58Decode, AccountId} from 'oo7-zerochain';

export class AccountIdBond extends InputBond {
	constructor () { super() }
	makeIcon (p) {
		return p ? 'left' : this.state.ok
				? (<i style={{opacity: 1}} className='icon'>
					<Identicon
						account={this.state.external}
						style={{marginTop: '5px'}}
						size='28'
					/></i>)
				: undefined;
	}

	render () {
		const labelStyle = {
			position: 'absolute',
			zIndex: this.props.labelZIndex || 10
		};
		return InputBond.prototype.render.call(this);
	}
}
AccountIdBond.defaultProps = {
	placeholder: 'Name or address',
	validator: a => {
		let y = secretStore().find(a);
		if (y) {
			return { external: y.account, internal: a, ok: true, extra: { knowSecret: true } };
		}
		let z = addressBook().find(a);
		if (z) {
			return { external: z.account, internal: a, ok: true, extra: { knowSecret: false } };
		}
		return runtime.indices.ss58Decode(a).map(
			x => x
				? { external: x, internal: a, ok: true, extra: { knowSecret: !!secretStore().find(a) } }
				: null,
			undefined, undefined, false
		)
	},
	defaultValue: ''
};

export class SignerBond extends AccountIdBond {
	constructor () { super() }
}

SignerBond.defaultProps = {
	placeholder: 'Name or address',
	validator: a => {
		let y = secretStore().find(a);
		if (y) {
			return { external: y.account, internal: a, ok: true };
		}
		return runtime.indices.ss58Decode(a).map(
			x => x && secretStore().find(x)
				? { external: x, internal: a, ok: true }
				: null,
			undefined, undefined, false
		)
	},
	defaultValue: ''
};
