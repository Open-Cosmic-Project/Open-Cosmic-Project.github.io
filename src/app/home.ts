import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from './sections/hero';
import { FeedComponent } from './sections/feed';
import { ChannelsComponent } from './sections/channels';
import { ArchitectureComponent } from './sections/architecture';
import { ReposComponent } from './sections/repos';
import { CommunityComponent } from './sections/community';
import { ContributeComponent } from './sections/contribute';
import { DocsTeaserComponent } from './docs/docs-teaser';

@Component({
  selector: 'oc-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroComponent, FeedComponent, ChannelsComponent, ArchitectureComponent, ReposComponent, CommunityComponent, DocsTeaserComponent, ContributeComponent],
  template: `<oc-hero /><oc-feed /><oc-channels /><oc-architecture /><oc-repos /><oc-community /><oc-docs-teaser /><oc-contribute />`,
})
export class HomeComponent {}
