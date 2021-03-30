import {ChangeDetectionStrategy, Component, Inject, Input, OnInit, PLATFORM_ID} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Item } from '../../../core/shared/item.model';
import { environment } from '../../../../environments/environment';
import { BitstreamDataService } from '../../../core/data/bitstream-data.service';
import { getFirstCompletedRemoteData } from '../../../core/shared/operators';
import { RemoteData } from '../../../core/data/remote-data';
import { PaginatedList } from '../../../core/data/paginated-list.model';
import { Bitstream } from '../../../core/shared/bitstream.model';
import { hasValue } from '../../../shared/empty.util';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/operators';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'ds-mirador-viewer',
  styleUrls: ['./mirador-viewer.component.scss'],
  templateUrl: './mirador-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiradorViewerComponent implements OnInit {

  @Input() item: Item;

  @Input() query: string;

  @Input() searchable: boolean;

  iframeViewerUrl: Observable<SafeResourceUrl>;

  multi = false;

  notMobile = false;

  constructor(private sanitizer: DomSanitizer,
              private bitstreamDataService: BitstreamDataService,
              @Inject(PLATFORM_ID) private platformId: any) {
  }

  /**
   * Creates the url for the Mirador iframe. Adds parameters for the displaying the search panel, query results,
   * or  multi-page thumbnail navigation.
   */
  setURL() {
    const width = window.innerWidth;
    // The path to the REST manifest endpoint.
    const manifestApiEndpoint = encodeURIComponent(environment.rest.baseUrl + '/api/iiif/'
      + this.item.id + '/manifest');
    // The Express path to Mirador viewer.
    let viewerPath = '/iiif/mirador/index.html?manifest=' + manifestApiEndpoint;
    if (this.searchable) {
      // Tell the viewer add search to menu.
      viewerPath += '&searchable=' + this.searchable;
    }
    if (this.query) {
      // Tell the viewer to execute a search for the query term.
      viewerPath += '&query=' + this.query;
    }
    if (this.multi) {
      // Tell the viewer to add thumbnail navigation. If searchable, thumbnail navigation is added by default.
      viewerPath += '&multi=' + this.multi;
    }
    if (this.notMobile) {
      viewerPath += '&notMobile=true';
    }
    // TODO: review whether the item.id should be sanitized. The query term should be (check mirador viewer).
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerPath);
  }

  ngOnInit(): void {
    /**
     * Initializes the iframe url observable.
     */
    if (isPlatformBrowser(this.platformId)) {
      if (window.innerWidth > 768) {
        this.notMobile = true;
      }
      this.iframeViewerUrl = this.bitstreamDataService
        .findAllByItemAndBundleName(this.item, 'IIIF', {})
        .pipe(
          getFirstCompletedRemoteData(),
          map((bitstreamsRD: RemoteData<PaginatedList<Bitstream>>) => {
            if (hasValue(bitstreamsRD.payload)) {
              if (bitstreamsRD.payload.totalElements > 2) {
                /* IIIF bundle contains multiple images. The IIIF bundle also contains
                 * a single json file so multi is true only when count is 3 or more . */
                this.multi = true;
              }
            }
            return this.setURL();
          })
        );
    }
  }
}