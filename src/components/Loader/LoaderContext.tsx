import React, {createContext, useContext, useEffect, useState} from 'react';
import {Loader} from "./Loader";

const LoaderContext = createContext({});

export const LoaderProvider = ({ children }: any) => {
    const [loading, setLoading] = useState(false);

    const showLoader = () => {
        setLoading(true);
    };

    const hideLoader = () => {
        setLoading(false);
    };


    return (
        <LoaderContext.Provider value={{ loading, showLoader, hideLoader }}>
            <Loader isShow={loading}>
                {children}
            </Loader>
        </LoaderContext.Provider>
    );
};

export const useLoader = (): any => {
    return useContext(LoaderContext);
};
