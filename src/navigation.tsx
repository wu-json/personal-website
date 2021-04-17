import { History } from 'history';
import { Route, Router, Switch } from 'react-router-dom';

const Navigation = ({ history }: { history: History }) => (
    <Router history={history}>
        <Switch>
            <Route path="/" />
        </Switch>
    </Router>
);

export { Navigation };
