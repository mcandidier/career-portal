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
  public values: any[] = [];

  constructor(
    private service: SearchService,
    private formUtils: FormUtils,
    private activatedRoute: ActivatedRoute, 
    private _router: Router) {

      localStorage.removeItem('loading'); // clear loading state

      let categories: string[] = ['publishedCategory.id{?^^equals}2000369', 'publishedCategory.id{?^^equals}2000055'];
      const _filter: any = {'publishedCategory': categories};  
      this.filter = _filter;
      console.log('_filter', _filter);
      this.activatedRoute.queryParams.subscribe((params: object) => {
        if (Object.keys(params).length !== 0) {
          // console.log('------------------------------');
          // console.log(params, 'params'); // Print the parameter to the console. 
          this.hasParams = true;
          this.routerParams = params;
        } else {
          localStorage.removeItem('category');
          localStorage.removeItem('state');
          localStorage.removeItem('city');
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
    console.log(this.filter, 'this filter init..');
    this.service.getCurrentJobIds(this.filter, [this.fieldName]).subscribe(this.handleJobIdsOnSuccess.bind(this));  
  }

  private getFilterParams(key: string): any {
    const params: string = this.routerParams[key];
    // let state: string = this.routerParams['state'];
    // let city: string = this.routerParams['city'];
    const listParams: string[] = params.split(',');
    return listParams.map( (element: string) => element );
  }

  private setRouterParams(fieldName: any): void {
    console.log('click filter');
    this.selectedFilter = this.control.options.filter((item: any ) => item.checked === true);
    let values: string[] = this.selectedFilter.map((item: object) => {
      let label: any =  item['label'];
      return label;
    });

    const filteredKeys: string = values.toString(); 
    switch (fieldName) {
      case 'publishedCategory':
        localStorage.setItem('category', filteredKeys);
        break;
      case 'address(state)':
        localStorage.setItem('state', filteredKeys);
        break;
      case 'address(city)':
        localStorage.setItem('city', filteredKeys);
        break;
      default:
        break;
    }

    let params: object = {
      'category': localStorage.getItem('category'),
      'state': localStorage.getItem('state'),
      'city': localStorage.getItem('city'),
    };

    this._router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: params,
      queryParamsHandling: 'merge',
      skipLocationChange: false,
    });

    // if (this.hasParams) {
    //   console.log('has params..');
    //   switch (this.field) {
    //     case 'address(city)':
    //       const city: string[] = this.getFilterParams('city');

    //       break;
    //     case 'address(state)':
    //       const state: string[] = this.getFilterParams('state');

    //       break;
    //     case 'publishedCategory(id,name)':
          
    //       break;
    //     default:
    //       break;
    //   }
    // }
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
          this.setRouterParams(this.fieldName);
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
          this.setRouterParams(this.fieldName);
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
          this.checkboxFilter.emit(values);
          this.setRouterParams(this.fieldName);
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

    const _categories: string[] = this.getFilterParams('category');
    const _filteredValues: string[] = [];
    _categories.forEach( (category: string) => {
      console.log(category, 'category');
      this.control.options.forEach((item: any) =>  {
        const value: any = item['value'];
        if (item['label'] === category) {
          const filterValue: string = `publishedCategory.id{?^^equals}${value}`;
          _filteredValues.push(filterValue);
          this.values.push(value);
        }
      });
    });

    const loading: string = localStorage.getItem('loading');
    if (loading !== 'true') {
      this.checkboxFilter.emit(_filteredValues);
      this.lastSetValue = this.values;
      localStorage.setItem('loading', 'true');
    }

    this.formUtils.setInitialValues([this.control], {'checklist': this.lastSetValue});
    this.form = this.formUtils.toFormGroup([this.control]);
    this.loading = false;
  }
}
