import { notFound } from 'next/navigation';
import Playground from './Playground';

// Loading animation playground (AER-70). Development only: 404 on a production
// build.
export default function Page() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <Playground />;
}
