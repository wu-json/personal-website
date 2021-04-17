import { History } from 'history';
import { Route, Router, Switch } from 'react-router-dom';
import { HomeScreen } from 'src/screens/Home';

const Navigation = ({ history }: { history: History }) => (
    <Router history={history}>
        <Switch>
            <Route path="/" component={HomeScreen} />
        </Switch>
    </Router>
);

export { Navigation };
