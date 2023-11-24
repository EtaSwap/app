export const parseTokens = (tokens) => tokens.map(token => token[1])
    .sort((a, b) =>
        a.providers.length > b.providers.length
            ? -1
            : (a.providers.length === b.providers.length
                    ? (a.name > b.name ? 1 : -1)
                    : 1
            )
    )
