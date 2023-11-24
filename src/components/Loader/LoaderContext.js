import React, {createContext, useContext, useEffect, useState} from 'react';
import {Loader} from "./Loader";

const LoaderContext = createContext();

export const LoaderProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);

    const showLoader = () => {
        setLoading(true);
    };

    const hideLoader = () => {
        setLoading(false);
    };

    useEffect(() => {
        console.log(loading);
    }, [loading]);


    return (
        <LoaderContext.Provider value={{ loading, showLoader, hideLoader }}>
            <Loader isShow={loading}>
                {children}
            </Loader>
        </LoaderContext.Provider>
    );
};

export const useLoader = () => {
    return useContext(LoaderContext);
};
