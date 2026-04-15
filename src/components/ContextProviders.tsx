interface ContextProvidersProps {
    providers: React.ComponentType<{ children: React.ReactNode }>[];
    children: React.ReactNode;
}

export const ContextProviders = ({providers, children}: ContextProvidersProps) => (
    <>
        {providers.reduceRight((acc, Provider) => (
            <Provider>{acc}</Provider>
        ), children)}
    </>
);
