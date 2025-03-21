### Steps to setup

1. Install all Dependencies using -

```
yarn
```

2. Run following command

```
forge build
```

3. For running escrow workflow script run

```
forge script script/Escrow.s.sol:OpenEscrow --rpc-url https://eth-sepolia.g.alchemy.com/v2/{API_KEY}
```

Note - use --broadcast for broadcasting the transaction
