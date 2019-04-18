import React from 'react';
import 'semantic-ui-css/semantic.min.css';
import { generateMnemonic } from 'bip39';
import { Icon, List, Label, Header, Segment, Divider, Button } from 'semantic-ui-react';
import { Bond, TransformBond } from 'oo7';
import { ReactiveComponent, If, Rspan } from 'oo7-react';
import { calls, runtime, chain, system, runtimeUp, ss58Decode, ss58Encode, addressBook, secretStore, addCodecTransform, encode, decode, hexToBytes, bytesToHex } from 'oo7-zerochain';
import Identicon from 'polkadot-identicon';
import { AccountIdBond, SignerBond } from './AccountIdBond.jsx';
import BalanceBond from './BalanceBond.jsx';
import InputBond from './InputBond.jsx';
import TransactButton from './TransactButton.jsx';
import FileUploadBond from './FileUploadBond.jsx';
import StakingStatusLabel from './StakingStatusLabel';
import { WalletList, SecretItem } from './WalletList';
import AddressBookList from './AddressBookList';
import TransformBondButton from './TransformBondButton';
import Pretty from './Pretty';
import { decrypt, decrypt_ca, gen_call, gen_call1, gen_call2 } from 'zerochain-wasm-utils';

export default class App extends ReactiveComponent {
	constructor() {
		super([], { ensureRuntime: runtimeUp })

		// For debug only.
		window.runtime = runtime;
		window.secretStore = secretStore;
		window.addressBook = addressBook;
		window.chain = chain;
		window.calls = calls;
		window.that = this;

		this.source = new Bond;
		this.amount = new Bond;
		this.destination = new Bond;
		this.nick = new Bond;
		this.lookup = new Bond;
		this.lookupRvk = this.lookup.map(v => v ? secretStore().rvkFromAccount(v) : undefined)
		this.lookupRvk.use()
		this.lookupDecBal = this.lookup.map(v => v ? runtime.confTransfer.encryptedBalance(v).map(e => e ? decrypt_ca(e, secretStore().getIvk(v)) : undefined) : undefined)
		this.lookupDecBal.use()

		this.name = new Bond;
		this.seed = new Bond;
		this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
		this.seedAccount.use()
		this.runtime = new Bond;

		this.address = new Bond;
		this.proof = new Bond;

		this.valueSender = new Bond;
		this.valueRecipient = new Bond;
		this.balanceSender = new Bond;
		this.rk = new Bond;

		this.provingKey = new Bond;
		this.preparedVk = new Bond;
		this.encAddress = new Bond;
		this.decBalance = this.encAddress.map(v => v ? runtime.confTransfer.encryptedBalance(v).map(e => e ? decrypt_ca(e, secretStore().getIvk(v)) : undefined) : undefined)
		this.decBalance.use()

		this.rvk = this.encAddress.map(v => v ? secretStore().rvkFromAccount(v) : undefined)
		this.rvk.use()
		// this.ivk = this.encAddress.map(v => v ? secretStore().getIvk(v) : undefined)
		// this.ivk.use()
		this.params = new Bond;

		addCodecTransform(
			'PreparedVk', 'Vec<u8>'
		);
		addCodecTransform(
			'PkdAddress', 'Hash'
		);
		addCodecTransform(
			'Ciphertext', 'Vec<u8>' // 64bytes
		);
		addCodecTransform(
			'Proof', 'Vec<u8>'
		);
		addCodecTransform(
			'SigVerificationKey', 'Hash'
		);
	}

	readyRender() {
		return (<div>
			<div>
				<Label>Name <Label.Detail>
					<Pretty className="value" value={system.name} /> v<Pretty className="value" value={system.version} />
				</Label.Detail></Label>
				<Label>Chain <Label.Detail>
					<Pretty className="value" value={system.chain} />
				</Label.Detail></Label>
				<Label>Runtime <Label.Detail>
					<Pretty className="value" value={runtime.version.specName} /> v<Pretty className="value" value={runtime.version.specVersion} /> (
						<Pretty className="value" value={runtime.version.implName} /> v<Pretty className="value" value={runtime.version.implVersion} />
					)
				</Label.Detail></Label>
				<Label>Height <Label.Detail>
					<Pretty className="value" value={chain.height} />
				</Label.Detail></Label>
				<Label>Authorities <Label.Detail>
					<Rspan className="value">{
						runtime.core.authorities.mapEach(a => <Identicon key={a} account={a} size={16} />)
					}</Rspan>
				</Label.Detail></Label>
			</div>
			<Segment style={{ margin: '1em' }}>
				<Header as='h2'>
					<Icon name='key' />
					<Header.Content>
						Wallet
						<Header.Subheader>Manage your secret keys</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{ paddingBottom: '1em' }}>
					<div style={{ fontSize: 'small' }}>seed</div>
					<InputBond
						bond={this.seed}
						reversible
						placeholder='Some seed for this key'
						validator={n => n || null}
						action={<Button content="Another" onClick={() => this.seed.trigger(generateMnemonic())} />}
						iconPosition='left'
						icon={<i style={{ opacity: 1 }} className='icon'><Identicon account={this.seedAccount} size={28} style={{ marginTop: '5px' }} /></i>}
					/>
				</div>
				<div style={{ paddingBottom: '1em' }}>
					<div style={{ fontSize: 'small' }}>name</div>
					<InputBond
						bond={this.name}
						placeholder='A name for this key'
						validator={n => n ? secretStore().map(ss => ss.byName[n] ? null : n) : null}
						action={<TransformBondButton
							content='Create'
							transform={(name, seed) => secretStore().submit(seed, name)}
							args={[this.name, this.seed]}
							immediate
						/>}
					/>
				</div>
				<div style={{ paddingBottom: '1em' }}>
					<WalletList />
				</div>
			</Segment>
			<Divider hidden />
			<Segment style={{ margin: '1em' }} padded>
				<Header as='h2'>
					<Icon name='send' />
					<Header.Content>
						Confidential transfer
						<Header.Subheader>Send the coins. The value is encrypted. </Header.Subheader>
					</Header.Content>
				</Header>
				<FileUploadBond bond={this.provingKey} content='Add Proving Key' />
				<Divider hidden />
				<FileUploadBond bond={this.preparedVk} content='Add Verifying Key' />
				<Divider hidden />
				<div style={{ fontSize: 'small' }}>From</div>
				<SignerBond bond={this.encAddress} />
				<If condition={this.encAddress.ready()} then={<span>
					<Label>Decrypted Balance
						<Label.Detail>
							<Pretty value={this.decBalance} />
						</Label.Detail>
					</Label>
					<Label>Encrypted Balance
					<Label.Detail>
							<Pretty value={this.encAddress.map(e => runtime.confTransfer.encryptedBalance(e))} />
						</Label.Detail>
					</Label>
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.rvk)} />
						</Label.Detail>
					</Label>
				</span>} />
				<div style={{ fontSize: 'small', paddingTop: '1em' }}>To</div>
					<AccountIdBond bond={this.destination} />
				<div style={{ fontSize: 'small', paddingTop: '1em' }}>Amount</div>
					<BalanceBond bond={this.amount} />
				<div style={{ fontSize: 'small', paddingTop: '1em' }}>Proof (192 bytes)</div>
					<InputBond bond={this.proof} validator={n => n || null} placeholder='0x...' />
				<div style={{ fontSize: 'small', paddingTop: '1em' }}>Encrypted amount by sender (64 bytes)</div>
				<InputBond bond={this.valueSender} validator={n => n || null} placeholder='0x...' />
				<div style={{ fontSize: 'small', paddingTop: '1em' }}>Encrypted amount by recipient (64 bytes)</div>
				<InputBond bond={this.valueRecipient} validator={n => n || null} placeholder='0x...' />
				<Divider hidden />
				<TransactButton
					content="Confidential transfer"
					icon='send'
					bond={this.params}
					// tx={{
					// 	sender: this.encAddress,
					// 	call: calls.confTransfer.confidentialTransfer(
					// 		this.proof,
					// 		this.encAddress,
					// 		this.destination,
					// 		this.valueSender,
					// 		this.valueRecipient,
					// 		this.rvk
					// 	),
					// 	index: runtime.system.accountNonce(this.rvk)
					// }}
					tx={() => get_calls(
							this.encAddress,
							this.destination,
							this.amount,
							this.decBalance,
							this.provingKey,
							this.preparedVk
						)}
				/>
				{/* <Button onClick={() => get_calls(this.encAddress,
							this.destination,
							this.amount,
							this.decBalance,
							this.provingKey,
							this.preparedVk)}/> */}
			</Segment>
			<Divider hidden />
			<Segment style={{ margin: '1em' }} padded>
				<Header as='h2'>
					<Icon name='search' />
					<Header.Content>
						Address Book
						<Header.Subheader>Inspect the status of any account and name it for later use</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{ paddingBottom: '1em' }}>
					<div style={{ fontSize: 'small' }}>lookup account</div>
					<AccountIdBond bond={this.lookup} />
					<If condition={this.lookup.ready()} then={<div>
						<Label>Encrypted Balance
							<Label.Detail>
								<Pretty value={runtime.confTransfer.encryptedBalance(this.lookup)} />
							</Label.Detail>
						</Label>
						<Label>Decrypted Balance
							<Label.Detail>
								<Pretty value={this.lookupDecBal} />
							</Label.Detail>
						</Label>
						<Label>Nonce
							<Label.Detail>
								<Pretty value={runtime.system.accountNonce(this.lookupRvk)} />
							</Label.Detail>
						</Label>
						<Label>Address
							<Label.Detail>
								<Pretty value={this.lookup} />
							</Label.Detail>
						</Label>
					</div>} />
				</div>
				<div style={{ paddingBottom: '1em' }}>
					<div style={{ fontSize: 'small' }}>name</div>
					<InputBond
						bond={this.nick}
						placeholder='A name for this address'
						validator={n => n ? addressBook().map(ss => ss.byName[n] ? null : n) : null}
						action={<TransformBondButton
							content='Add'
							transform={(name, account) => { addressBook().submit(account, name); return true }}
							args={[this.nick, this.lookup]}
							immediate
						/>}
					/>
				</div>
				<div style={{ paddingBottom: '1em' }}>
					<AddressBookList />
				</div>
			</Segment>
		</div>);
	}
}

function get_calls(sender, recipient, amount, balance, provingKey, preparedVk) {
	return Bond.mapAll([sender, recipient, amount, balance, provingKey, preparedVk],
		(sender, recipient, amount, balance, provingKey, preparedVk) => {
			let sk = secretStore().seedFromAccount(sender)
			let randomSeed = new Uint32Array(8)
			self.crypto.getRandomValues(randomSeed)

			console.log(sk)
			console.log(recipient)
			console.log(amount)
			console.log(balance)
			console.log(randomSeed)
			console.log(provingKey)
			console.log(preparedVk)

			let args = gen_call(sk, recipient, amount, balance, provingKey, preparedVk, randomSeed) // TODO:
			console.log("AAA!!!!!")
			return {
				sender: sender, 
				call: calls.confTransfer.confidentialTransfer(
					args.zk_proof,
					args.address_sender,
					args.address_recipient,
					args.value_sender,
					args.value_recipient,
					args.balance_sender,
					args.rk
				),
				rsk: args.rsk
			}
	})
}
