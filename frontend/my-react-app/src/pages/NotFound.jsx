import { Link } from "react-router-dom";
import { Page } from "../components/Layout";

export default function NotFound() {
  return (
    <Page>
      <section className="notFoundPage">
        <span className="notFoundCode">404</span>
        <p className="pageKicker">PAGE NOT FOUND</p>
        <h1>We couldn't find that page</h1>
        <p>It may have moved, or the address may be incorrect.</p>
        <div className="notFoundActions">
          <Link className="primaryAction" to="/">Back to home</Link>
          <Link className="outlineAction" to="/turfs">Browse turfs</Link>
        </div>
      </section>
    </Page>
  );
}
