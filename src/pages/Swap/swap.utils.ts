import {Token} from "../../types/token";

export const sortTokens = (tokensMap: Map<string, Token>): Token[] => (Array.from(tokensMap)
    .map(wrap => wrap[1])
    .sort((a, b) =>
        a.providers.length > b.providers.length
            ? -1
            : (a.providers.length === b.providers.length
                    ? (a.name > b.name ? 1 : -1)
                    : 1
            )
    )
);

export const bytesFromHex = (hex: string) => Uint8Array.from(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));