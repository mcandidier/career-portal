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

  constructor(
    private service: SearchService,
    private formUtils: FormUtils,
    private activatedRoute: ActivatedRoute, 
    private _router: Router) {

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
    this.service.getCurrentJobIds(this.filter, [this.fieldName]).subscribe(this.handleJobIdsOnSuccess.bind(this));
    this.setRouterParams(this.fieldName);
  }

  private setFilterFromParams(): any {
    let category: string = this.routerParams['category'];
    let state: string = this.routerParams['state'];
    let city: string = this.routerParams['city'];

    const listCategory: string[] = category.split(',');
    console.log('listCategory', listCategory);
    let categories: string[] = listCategory.map( (element: string) => element );
    return categories;
  }

  private setRouterParams(fieldName: any): void {
    console.log(fieldName, 'fieldName');

    this.selectedFilter = this.control.options.filter((item: any ) => item.checked === true);
    let values: string[] = this.selectedFilter.map((item: object) => {
      // let label: any =  item['label'].split(' (')[0]; // removes (1)
      let label: any =  item['label'];
      return label;
    });

    const filteredKeys: string = values.toString(); 
    console.log(filteredKeys, 'filterkeys');
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

  }

  private handleJobIdsOnSuccess(res: any): void {
    let resultIds: number[] = res.data.map((result: any) => { return result.id; });
    this.service.getAvailableFilterOptions(resultIds, this.field).subscribe(this.setFieldOptionsOnSuccess.bind(this));
  }

  private setFieldOptionsOnSuccess(res: any): void {
    let interaction: Function;

    console.log('interaction...');
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
              console.log(value, 'value...');
              return `address.state{?^^equals}{?^^delimiter}${value}{?^^delimiter}`;
            });
          }
          this.checkboxFilter.emit(values);
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

    if (this.hasParams) {
      let values: any[] = []; 
      const categories: string[] = this.setFilterFromParams();
      categories.forEach( (category: string) => {
        this.control.options.forEach((item: any) =>  {
          const label: string = item['label'];
          const value: any = item['value'];
          if (item['label'] === category) {
            // const filterData: string = `{publishedCategory.id{?^^equals}${value}`;
            values.push(value);
          }
        });
      });
      this.lastSetValue = values;
    }

    this.formUtils.setInitialValues([this.control], {'checklist': this.lastSetValue});
    this.form = this.formUtils.toFormGroup([this.control]);
    this.loading = false;
  }

}
