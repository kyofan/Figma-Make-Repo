// Mock for figma:react to allow the project to run in a standard browser environment
export const defineProperties = (component: any, properties: any) => {
    console.log('Figma properties defined:', properties);
    return component;
};
