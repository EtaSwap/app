export type NetworkProps = {
    getTokensUrl: string | null;
}

export type Props = {
    [key: string]: NetworkProps;
}