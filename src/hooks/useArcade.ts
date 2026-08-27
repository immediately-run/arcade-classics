import { useContext } from 'react';
import { ArcadeContext } from '../lib/arcadeContext';

export const useArcade = () => useContext(ArcadeContext);
