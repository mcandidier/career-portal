localStorage.removeItem('')
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { SearchService } from '../../services/search/search.service';
import { CheckListControl, FormUtils, NovoFormGroup, FieldInteractionApi } from 'novo-elements';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-sidebar-filter',
  templateUrl: './sidebar-filter.component.html',
  styleUrls: ['./sidebar-filter.component.scss'],
})
export class SidebarFilterComponent implements OnChanges {
  @Output() public checkboxFilter: EventEmitter<any> = new EventEmitter();
  @Input() public filter: any;
  @Input() public field: string;
  @Input() public title: string;
  public loading: boolean = true;
  public control: CheckListControl;
  public form: NovoFormGroup;
  public viewAllOptions: boolean = false;
  public lastSetValue: string[];
  public options: any[];
  public fieldName: string;
  public selectedFilter: any;
  public hasParams: boolean = false;
  public routerParams: any;
  private values: any[] = [];
  private filterValues: any[] = [];
  private onInteract: boolean = false;

  constructor(
    private service: SearchService,
    private formUtils: FormUtils,
    private activatedRoute: ActivatedRoute, 
    private _router: Router) {

      localStorage.clear();
      console.log('contructor');

      this.activatedRoute.queryParams.subscribe((params: object) => {
        if (Object.keys(params).length !== 0) {
          this.hasParams = true;
          this.routerParams = params;
          localStorage.setItem('category', params['category']);
          localStorage.setItem('city', params['city']);
          localStorage.setItem('state', params['state']);
        }
      });
    }

  public ngOnChanges(changes: SimpleChanges): void {
    switch (this.field) {
      case 'publishedCategory(id,name)':
        this.fieldName = 'publishedCategory';
        break;
      default:
        this.fieldName = this.field;
        break;
    }
    this.getFilterOptions();
  }

  public toggleAllOptions(): void {
    this.viewAllOptions = !this.viewAllOptions;
  }

  private getFilterOptions(): void {
    this.loading = true; 
    this.service.getCurrentJobIds(this.filter, [this.fieldName]).subscribe(this.handleJobIdsOnSuccess.bind(this));  
  }

  private getFilterParams(key: string): any {
    // const params: string = this.routerParams[key];
    const params: string = localStorage.getItem(key);
    if (params) {
      const listParams: string[] = params.split(',');
      return listParams.map( (element: string) => element );
    } else {
      return [];
    }
  }

  private setRouterParams(field: string): void {
    // find all active filters
    // get all labels for active filters as array
    // convert array of filters into string separated by comma
    console.log('clickkkk');
    this.onInteract = true;
    let labels: string[] = [];
    let filteredKeys: string;
    setTimeout( () => {
      this.options.map( (option: object ) => {
        const optionId: any = option['value'];
        if (this.lastSetValue.includes(optionId)) {
          console.log('found', option['label']);
          labels.push(option['label']);
        }
      });
      filteredKeys = labels.toString();
      let params: object = {};
      params[field] = filteredKeys;
      this.attachParamsToUrl(params);
    }, 300);
  }

  private attachParamsToUrl(params: object): void {
    console.log('params', params);
    this._router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: params,
      queryParamsHandling: 'merge',
      skipLocationChange: false,
    });
  }

  private handleJobIdsOnSuccess(res: any): void {
    let resultIds: number[] = res.data.map((result: any) => { return result.id; });
    this.service.getAvailableFilterOptions(resultIds, this.field).subscribe(this.setFieldOptionsOnSuccess.bind(this));
  }

  private setFieldOptionsOnSuccess(res: any): void {
    let interaction: Function;
    switch (this.field) {
      case 'address(city)':
        this.options = res.data.map((result: IAddressListResponse) => {
          return {
            value: result.address.city,
            label: `${result.address.city} (${result.idCount})`,
          };
        }).filter((item: any) => {
          return item.value;
        });
        interaction = (API: FieldInteractionApi) => {
          let values: string[] = [];
          this.lastSetValue = API.getActiveValue();
          if (API.getActiveValue()) {
            values = API.getActiveValue().map((value: string ) => {
              return `address.city{?^^equals}{?^^delimiter}${value}{?^^delimiter}`;
            });
          }
          this.checkboxFilter.emit(values);
          this.setRouterParams('city');
        };
        break;
      case 'address(state)':
        this.options = res.data.map((result: IAddressListResponse) => {
          return {
            value: result.address.state,
            label: `${result.address.state} (${result.idCount})`,
          };
        }).filter((item: any) => {
          return item.value;
        });
        interaction = (API: FieldInteractionApi) => {
          let values: string[] = [];
          this.lastSetValue = API.getActiveValue();
          if (API.getActiveValue()) {
            values = API.getActiveValue().map((value: string ) => {
              return `address.state{?^^equals}{?^^delimiter}${value}{?^^delimiter}`;
            });
          }
          this.checkboxFilter.emit(values);
          this.setRouterParams('state');
        };
        break;
      case 'publishedCategory(id,name)':
        this.options = res.data
        .filter((unfilteredResult: ICategoryListResponse) => {
          return !!unfilteredResult.publishedCategory;
        })
        .map((result: ICategoryListResponse) => {
          return {
            value: result.publishedCategory.id,
            label: `${result.publishedCategory.name} (${result.idCount})`,
          };
        });
        interaction = (API: FieldInteractionApi) => {
          let values: string[] = [];
          this.lastSetValue = API.getActiveValue();
          if (API.getActiveValue()) {
          values = API.getActiveValue().map((value: number) => {
            return `publishedCategory.id{?^^equals}${value}`;
          });
          }
          console.log(this.lastSetValue);
          this.checkboxFilter.emit(values);
          this.setRouterParams('category');
        };
        break;
      default:
        break;
    }

    this.control = new CheckListControl({
      key: 'checklist',
      options: this.options,
      interactions: [{event: 'change', script: interaction.bind(this), invokeOnInit: false}],
    });

    const isLoading: string = localStorage.getItem(`loader-${this.fieldName}`);
    if (!this.onInteract) {
      if ( this.hasParams && isLoading !== 'true') {
        console.log('active filter', this.fieldName);
        let _filteredParams: string[] = [];
        switch (this.field) {
          case 'address(city)':
            _filteredParams = this.getFilterParams('city');
            this.setInitialFilter(_filteredParams);
            break;
          case 'address(state)':
            _filteredParams = this.getFilterParams('state');
            this.setInitialFilter(_filteredParams);
            break;
          case 'publishedCategory(id,name)':
            _filteredParams = this.getFilterParams('category');
            this.setInitialFilter(_filteredParams);
            break;
          default:
            break;
        }
        this.lastSetValue = this.values;
        this.checkboxFilter.emit(this.filterValues);
        localStorage.setItem(`loader-${this.fieldName}`, 'true');
      }
    }
    
    this.formUtils.setInitialValues([this.control], {'checklist': this.lastSetValue});
    this.form = this.formUtils.toFormGroup([this.control]);
    this.loading = false;
  }

  private setInitialFilter(filterParams: string[]): void {
    filterParams.forEach( (val: string) => {
      console.log(val, 'filteredItem');
      let filterValue: string;
    
      this.control.options.forEach((item: any) =>  {
        const value: any = item['value'];
        if (item['label'] === val) {
          switch (this.field) {
            case 'address(city)':
              filterValue = `address.city{?^^equals}{?^^delimiter}${value}{?^^delimiter}`;
              break;
            case 'address(state)':
              filterValue = `address.state{?^^equals}{?^^delimiter}${value}{?^^delimiter}`;
              break;
            case 'publishedCategory(id,name)':
              filterValue = `publishedCategory.id{?^^equals}${value}`; 
              break;
            default: 
              break;
          }

          this.filterValues.push(filterValue);
          this.values.push(value);
        }
      });
    });
  }

}
