import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { campusEvents, newsFallback, programCatalog } from '../content';
import { SectionHeading } from '../components/SiteChrome';

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function Home() {
  const [news, setNews] = useState(newsFallback);
  const [programs, setPrograms] = useState(programCatalog.slice(0, 4));

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.news(), api.programs()]).then(([newsResult, programResult]) => {
      if (!active) return;
      if (newsResult.status === 'fulfilled' && newsResult.value.length) {
        setNews(newsResult.value.map((item) => ({ ...item, category: 'Campus news' })));
      }
      if (programResult.status === 'fulfilled' && programResult.value.length) {
        const enriched = programResult.value.map((item) => ({
          ...programCatalog.find((program) => program.name === item.name),
          ...item,
        }));
        setPrograms(enriched);
      }
    });
    return () => { active = false; };
  }, []);

  return (
    <main id="main-content">
      <section className="home-hero">
        <div className="site-container home-hero__grid">
          <div className="home-hero__copy">
            <p className="eyebrow eyebrow--light">A liberal arts college in Northbridge, Vermont</p>
            <h1>Where purpose<br /><em>takes root.</em></h1>
            <p>
              Crestwood is a close-knit college where ambitious study, generous mentorship, and a deep
              sense of place prepare you to build a life that matters.
            </p>
            <div className="hero-actions">
              <Link className="button button--gold" to="/admissions">Start your application</Link>
              <Link className="button button--ghost-light" to="/academics">Explore programs</Link>
            </div>
          </div>
          <div className="home-hero__visual" aria-label="An abstract illustration of Crestwood's wooded campus">
            <div className="campus-art">
              <div className="campus-art__sun" />
              <div className="campus-art__ridge campus-art__ridge--back" />
              <div className="campus-art__hall">
                <span className="campus-art__cupola" />
                <span className="campus-art__windows" />
                <span className="campus-art__door" />
              </div>
              <div className="campus-art__ridge campus-art__ridge--front" />
              <div className="campus-art__caption"><span>Founders Hall</span><strong>Since 1894</strong></div>
            </div>
          </div>
        </div>
        <div className="home-hero__rule" aria-hidden="true" />
      </section>

      <section className="impact-strip" aria-label="Crestwood at a glance">
        <div className="site-container impact-strip__grid">
          <div><strong>4,200</strong><span>undergraduate students</span></div>
          <div><strong>14:1</strong><span>student–faculty ratio</span></div>
          <div><strong>96%</strong><span>employed or in graduate school</span></div>
          <div><strong>70+</strong><span>clubs and organizations</span></div>
        </div>
      </section>

      <section className="section section--cream">
        <div className="site-container editorial-intro">
          <div>
            <p className="eyebrow">The Crestwood experience</p>
            <h2>Room to explore.<br />People who notice.</h2>
          </div>
          <div className="editorial-intro__body">
            <p className="lead">
              Your education should be broad enough to surprise you and personal enough to change you.
            </p>
            <p>
              Here, professors become mentors, every program makes space for practice, and the natural
              world is part of the classroom. You will test ideas, make useful things, and learn alongside
              people who want you to succeed.
            </p>
            <Link className="text-link" to="/about">Why students choose Crestwood <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <SectionHeading
            eyebrow="Find your direction"
            title="Programs shaped around real questions"
            intro="Pair a rigorous major with the freedom to connect ideas across disciplines."
            link={<Link className="text-link" to="/academics">View all programs <span aria-hidden="true">→</span></Link>}
          />
          <div className="program-preview-grid">
            {programs.slice(0, 4).map((program, index) => (
              <article className="program-preview-card" key={program.name}>
                <span className="program-preview-card__number">0{index + 1}</span>
                <div>
                  <p>{program.category || 'Undergraduate program'}</p>
                  <h3>{program.name}</h3>
                  <span>{program.degree || program.duration}</span>
                </div>
                <Link to="/academics" aria-label={`Explore ${program.name}`}><span aria-hidden="true">↗</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section campus-feature">
        <div className="site-container campus-feature__grid">
          <div className="campus-feature__art" aria-hidden="true">
            <div className="feature-art feature-art--lake"><span /></div>
            <div className="feature-art feature-art--library"><span /></div>
          </div>
          <div className="campus-feature__copy">
            <p className="eyebrow eyebrow--light">A campus in its element</p>
            <h2>Close to the world. Closer to one another.</h2>
            <p>
              Wooded trails, a lively small city, and welcoming spaces give you room to recharge and
              reasons to join in. Campus is designed for the unplanned conversations that become lasting
              friendships.
            </p>
            <Link className="button button--ghost-light" to="/campus-life">Explore campus life</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-container home-news-layout">
          <div className="home-news">
            <SectionHeading eyebrow="From Crestwood" title="News & stories" />
            <div className="news-list">
              {news.slice(0, 3).map((item) => (
                <article className="news-row" key={`${item.title}-${item.date}`}>
                  <div className="news-row__meta">
                    <span>{item.category || 'College news'}</span>
                    <time dateTime={item.date}>{formatDate(item.date)}</time>
                  </div>
                  <div><h3>{item.title}</h3><p>{item.summary}</p></div>
                </article>
              ))}
            </div>
          </div>
          <aside className="events-card" id="events">
            <p className="eyebrow">Upcoming</p>
            <h2>Campus events</h2>
            <div className="event-list">
              {campusEvents.map((event) => (
                <article key={event.title}>
                  <time><span>{event.month}</span><strong>{event.day}</strong></time>
                  <div><h3>{event.title}</h3><p>{event.meta}</p></div>
                </article>
              ))}
            </div>
            <Link className="text-link" to="/campus-life#events">See the campus calendar <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </section>

      <section className="home-cta">
        <div className="site-container home-cta__inner">
          <div><p className="eyebrow eyebrow--light">Your next chapter</p><h2>Come see what can grow here.</h2></div>
          <div className="hero-actions">
            <Link className="button button--gold" to="/admissions">Apply to Crestwood</Link>
            <Link className="button button--ghost-light" to="/admissions#visit">Plan a visit</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
